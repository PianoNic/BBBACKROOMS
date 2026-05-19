"""Tentacle floor plan generator.

Phase 1: each room gets a single-cell door on its N (or S as fallback)
side, then a 2-row-tall horizontal beam is laid just outside each door
extending left AND right until it hits another room/beam/grid-edge.

Phase 2: every pair of horizontal beams (and the atrium) is checked
for a 2-cell-wide vertical channel through EMPTY cells in their shared
x-range. Candidate channels feed an MST that connects everything into
one network with the shortest total vertical corridor footprint."""
from __future__ import annotations

import random

from app.world.constants import CELL_SIZE
from app.world.layout._rooms import place_outward
from app.world.layout._types import (
    CORRIDOR,
    DOOR,
    EMPTY,
    Direction,
    Layout,
    Rect,
    grid_size,
    paint,
    set_grid,
)

ATRIUM_SIZE = 8


def _build_corridor_halo(rooms) -> set[tuple[int, int]]:
    """1-cell ring of cells immediately outside every room wall.
    Corridors (beams and verticals) must not enter halo cells, so a
    corridor never sits flush against a room's wall. Door cells are
    in the halo but are already painted DOOR before corridor carving,
    so beams treat them as obstacles rather than overwriting them."""
    gw, gh = grid_size()
    halo: set[tuple[int, int]] = set()
    for room in rooms:
        r = room.rect
        for x in range(r.x - 1, r.x + r.w + 1):
            for y in (r.y - 1, r.y + r.h):
                if 0 <= x < gw and 0 <= y < gh:
                    halo.add((x, y))
        for y in range(r.y - 1, r.y + r.h + 1):
            for x in (r.x - 1, r.x + r.w):
                if 0 <= x < gw and 0 <= y < gh:
                    halo.add((x, y))
    return halo


def _pick_horizontal_door(
    grid: list[int], room,
) -> tuple[int, int, Direction] | None:
    """Pick a door on the room's N side (preferred) or S side, scored
    by how much EMPTY space sits beyond that wall. Returns None if
    neither side has at least 4 free cells in the 3-row strip
    immediately outside."""
    gw, gh = grid_size()
    r = room.rect

    def score(xs: range, ys: range) -> int:
        s = 0
        for y in ys:
            for x in xs:
                if 0 <= x < gw and 0 <= y < gh and grid[y * gw + x] == EMPTY:
                    s += 1
        return s

    candidates: list[tuple[int, int, int, Direction]] = []
    if r.y - 1 >= 0:
        sc = score(range(r.x, r.x + r.w), range(max(0, r.y - 3), r.y))
        candidates.append((sc, r.x + r.w // 2, r.y - 1, "N"))
    if r.y + r.h < gh:
        sc = score(range(r.x, r.x + r.w), range(r.y + r.h, min(gh, r.y + r.h + 3)))
        candidates.append((sc, r.x + r.w // 2, r.y + r.h, "S"))
    candidates.sort(reverse=True)
    for sc, dx, dy, side in candidates:
        if sc < 4:
            continue
        return (dx, dy, side)
    return None


def _lay_horizontal_beam(
    grid: list[int], layout: Layout,
    door: tuple[int, int, Direction], halo: set[tuple[int, int]],
) -> None:
    """Paint a 2-row-tall horizontal corridor in front of the door,
    extending left/right until something blocks it or until extending
    further would enter the room halo (which would put the corridor
    flush against another room's wall)."""
    gw, gh = grid_size()
    dx, dy, side = door
    if side == "N":
        beam_rows = (dy - 2, dy - 1)
    else:
        beam_rows = (dy + 1, dy + 2)
    if any(r < 0 or r >= gh for r in beam_rows):
        return
    left_x = dx
    while left_x - 1 >= 0 and all(
        grid[r * gw + (left_x - 1)] == EMPTY
        and (left_x - 1, r) not in halo
        for r in beam_rows
    ):
        left_x -= 1
    right_x = dx
    while right_x + 1 < gw and all(
        grid[r * gw + (right_x + 1)] == EMPTY
        and (right_x + 1, r) not in halo
        for r in beam_rows
    ):
        right_x += 1
    for r in beam_rows:
        for x in range(left_x, right_x + 1):
            if grid[r * gw + x] == EMPTY:
                grid[r * gw + x] = CORRIDOR
    layout.hallways.append(Rect(
        left_x, min(beam_rows), right_x - left_x + 1, 2,
    ))


def _connect_vertical(
    grid: list[int], layout: Layout, halo: set[tuple[int, int]],
) -> None:
    """Find all valid 2-wide vertical EMPTY channels that touch a
    corridor at both ends and avoid the room halo (so verticals don't
    sit flush against a room wall). Adjacent overlapping channels are
    grouped into one "gap region" and only the centered channel is
    carved."""
    gw, gh = grid_size()

    def cell_open(cx: int, cy: int) -> bool:
        return grid[cy * gw + cx] == EMPTY and (cx, cy) not in halo

    candidates: list[tuple[int, int, int]] = []
    for x in range(gw - 1):
        y = 0
        while y < gh:
            if not cell_open(x, y) or not cell_open(x + 1, y):
                y += 1
                continue
            run_start = y
            while y < gh and cell_open(x, y) and cell_open(x + 1, y):
                y += 1
            run_end = y - 1
            top_y = run_start - 1
            bot_y = run_end + 1
            top_ok = top_y >= 0 and (
                grid[top_y * gw + x] in (CORRIDOR, DOOR)
                or grid[top_y * gw + (x + 1)] in (CORRIDOR, DOOR)
            )
            bot_ok = bot_y < gh and (
                grid[bot_y * gw + x] in (CORRIDOR, DOOR)
                or grid[bot_y * gw + (x + 1)] in (CORRIDOR, DOOR)
            )
            if top_ok and bot_ok:
                candidates.append((x, run_start, run_end))

    n = len(candidates)
    parent = list(range(n))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    by_x: dict[int, list[int]] = {}
    for i, (x, _ys, _ye) in enumerate(candidates):
        by_x.setdefault(x, []).append(i)

    for i, (x, ys, ye) in enumerate(candidates):
        for nx in (x + 1, x + 2, x + 3):
            for j in by_x.get(nx, []):
                _xj, ysj, yej = candidates[j]
                if not (yej < ys or ysj > ye):
                    ra, rb = find(i), find(j)
                    if ra != rb:
                        parent[ra] = rb

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    for indices in groups.values():
        indices.sort(key=lambda k: candidates[k][0])
        chosen = candidates[indices[len(indices) // 2]]
        x, ys, ye = chosen
        if not all(
            grid[yy * gw + x] == EMPTY and grid[yy * gw + (x + 1)] == EMPTY
            for yy in range(ys, ye + 1)
        ):
            continue
        for yy in range(ys, ye + 1):
            grid[yy * gw + x] = CORRIDOR
            grid[yy * gw + (x + 1)] = CORRIDOR
        layout.hallways.append(Rect(x, ys, 2, ye - ys + 1))


def _bridge_corner_touches(
    grid: list[int], halo: set[tuple[int, int]],
) -> None:
    """Find spots where two corridor cells touch only diagonally (their
    corners are 1 cell apart but no orthogonal edge connects them) and
    fill the empty cell(s) between to form a clean L-junction.

    Two intermediate cells sit between every diagonal pair. If both can
    be painted without entering the room halo, we paint both (a 2x2
    corner). If only one fits, we paint that one (1-cell bridge).
    Cells in the room halo are never painted, so no patch ends up flush
    against a room wall."""
    gw, gh = grid_size()

    def open_cell(cx: int, cy: int) -> bool:
        if not (0 <= cx < gw and 0 <= cy < gh):
            return False
        return grid[cy * gw + cx] == EMPTY and (cx, cy) not in halo

    to_paint: set[tuple[int, int]] = set()
    for y in range(gh - 1):
        for x in range(gw - 1):
            tl = grid[y * gw + x] == CORRIDOR
            tr = grid[y * gw + (x + 1)] == CORRIDOR
            bl = grid[(y + 1) * gw + x] == CORRIDOR
            br = grid[(y + 1) * gw + (x + 1)] == CORRIDOR
            # Only fill pure diagonal-only touches (2 opposite corners
            # corridor, 2 empty). Filling 3-of-4 "step" patterns creates
            # 1-cell appendages that disagree with the tail-trim pass.
            if tl and br and not tr and not bl:
                for cx, cy in ((x + 1, y), (x, y + 1)):
                    if open_cell(cx, cy):
                        to_paint.add((cx, cy))
            elif tr and bl and not tl and not br:
                for cx, cy in ((x, y), (x + 1, y + 1)):
                    if open_cell(cx, cy):
                        to_paint.add((cx, cy))
    for cx, cy in to_paint:
        grid[cy * gw + cx] = CORRIDOR


def _trim_corridor_tails(grid: list[int]) -> None:
    """Iteratively trim 2-wide rail tails — the part of a corridor past
    its last intersection. Corridors here are always 2 cells wide, so
    erosion has to operate on 2-cell "slices" rather than single cells.

    A slice is the pair of cells perpendicular to the rail's direction
    at one end: e.g., a horizontal rail at rows (Y, Y+1) has slices at
    each column X = ((X, Y), (X, Y+1)). A slice is trimmable if:
      - neither cell is adjacent to a DOOR (keeps each room's entry), AND
      - the rail extends in exactly one direction from this slice (it's
        an end), AND
      - there's no perpendicular corridor branching off the slice (no
        intersection here).
    Iterate until stable."""
    gw, gh = grid_size()

    def is_corr(cx: int, cy: int) -> bool:
        if not (0 <= cx < gw and 0 <= cy < gh):
            return False
        return grid[cy * gw + cx] == CORRIDOR

    def door_adj(cx: int, cy: int) -> bool:
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < gw and 0 <= ny < gh and grid[ny * gw + nx] == DOOR:
                return True
        return False

    while True:
        to_clear: set[int] = set()

        # Vertical slice (column pair): tail end of a HORIZONTAL rail.
        for y in range(gh - 1):
            for x in range(gw):
                if not is_corr(x, y) or not is_corr(x, y + 1):
                    continue
                if door_adj(x, y) or door_adj(x, y + 1):
                    continue
                left = is_corr(x - 1, y) or is_corr(x - 1, y + 1)
                right = is_corr(x + 1, y) or is_corr(x + 1, y + 1)
                top = is_corr(x, y - 1)
                bot = is_corr(x, y + 2)
                if not top and not bot and (left ^ right):
                    to_clear.add(y * gw + x)
                    to_clear.add((y + 1) * gw + x)
                elif not (left or right or top or bot):
                    to_clear.add(y * gw + x)
                    to_clear.add((y + 1) * gw + x)

        # Horizontal slice (row pair): tail end of a VERTICAL rail.
        for y in range(gh):
            for x in range(gw - 1):
                if not is_corr(x, y) or not is_corr(x + 1, y):
                    continue
                if door_adj(x, y) or door_adj(x + 1, y):
                    continue
                top = is_corr(x, y - 1) or is_corr(x + 1, y - 1)
                bot = is_corr(x, y + 1) or is_corr(x + 1, y + 1)
                left = is_corr(x - 1, y)
                right = is_corr(x + 2, y)
                if not left and not right and (top ^ bot):
                    to_clear.add(y * gw + x)
                    to_clear.add(y * gw + (x + 1))
                elif not (left or right or top or bot):
                    to_clear.add(y * gw + x)
                    to_clear.add(y * gw + (x + 1))

        if not to_clear:
            return
        for idx in to_clear:
            grid[idx] = EMPTY


def _finalize_room_meta(room, door: tuple[int, int, Direction]) -> None:
    dx, dy, side = door
    r = room.rect
    room.front_dir = side
    room.door_x = (dx + 0.5) * CELL_SIZE
    room.door_z = (dy + 0.5) * CELL_SIZE
    if side in ("N", "S"):
        room.door_w = ((dx + 0.5) - (r.x + r.w / 2)) * CELL_SIZE
    else:
        room.door_w = ((dy + 0.5) - (r.y + r.h / 2)) * CELL_SIZE


def build_layout(rng: random.Random, width: int = 120, height: int = 120) -> Layout:
    set_grid(width, height)
    gw, gh = grid_size()
    grid = [EMPTY] * (gw * gh)
    layout = Layout(width=gw, height=gh)

    ax = (gw - ATRIUM_SIZE) // 2
    ay = (gh - ATRIUM_SIZE) // 2
    atrium = Rect(ax, ay, ATRIUM_SIZE, ATRIUM_SIZE)
    paint(grid, atrium, CORRIDOR)
    layout.atrium = atrium
    layout.hallways.append(atrium)

    rooms = place_outward(grid, atrium, rng)

    placed: list = []
    for room in rooms:
        door = _pick_horizontal_door(grid, room)
        if door is None:
            paint(grid, room.rect, EMPTY)
            continue
        placed.append((room, door))

    # Mark every door cell as DOOR up front so neighbouring beams stop
    # at it instead of paving over it.
    for room, door in placed:
        dx, dy, _side = door
        grid[dy * gw + dx] = DOOR

    halo = _build_corridor_halo([r for r, _ in placed])

    # Randomize order so no single room hogs an entire row.
    rng.shuffle(placed)
    for room, door in placed:
        _lay_horizontal_beam(grid, layout, door, halo)
        _finalize_room_meta(room, door)
        layout.rooms.append(room)
        layout.doors.append((room.door_x, room.door_z))

    _connect_vertical(grid, layout, halo)
    _bridge_corner_touches(grid, halo)
    _trim_corridor_tails(grid)

    layout.cells = [1 if t != EMPTY else 0 for t in grid]
    return layout
