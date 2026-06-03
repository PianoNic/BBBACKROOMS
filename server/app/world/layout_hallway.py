"""Hallway-grid floor plan generator with randomized lanes + BSP rooms.

The clean-junction property comes from corridors being single straight
rects, not paths of overlapping 2x2 blocks. We keep that property but
add irregularity:
  - Number of horizontal/vertical hallway lanes is randomized (2-4 each).
  - Lane positions are jittered around evenly-spaced slots.
  - Each block between lanes is BSP-subdivided into 1-3 rooms with thin
    2-wide spur corridors connecting interior rooms to the nearest main
    hallway. Every spur is also a single rect, so junctions stay clean."""
from __future__ import annotations

import random

from app.world.constants import CELL_SIZE
from app.world.layout._types import (
    CORRIDOR,
    DOOR,
    EMPTY,
    ROOM,
    Direction,
    Layout,
    Rect,
    Room,
    grid_size,
    paint,
    set_grid,
)

ATRIUM_SIZE = 8
HALL_WIDTH = 2
MARGIN = 4
ROOM_PAD = 1
LANE_JITTER = 4
BLOCK_BSP_THRESHOLD = 18   # blocks at least this big in their long axis get split
LEAF_MIN = 8

_ARCHETYPES = (
    ("classroom", 6),
    ("teacher_room", 3),
    ("toilet", 2),
    ("janitor_room", 1),
    ("gym", 1),
    ("cafeteria", 1),
    ("server_room", 1),
)


def _pick_archetype(rng: random.Random) -> str:
    kinds, weights = zip(*_ARCHETYPES)
    return rng.choices(kinds, weights=weights)[0]


def _lane_positions(
    rng: random.Random, axis_size: int, atrium_start: int, atrium_end: int,
) -> list[int]:
    """One mandatory lane through the atrium centre + 1-3 jittered lanes
    on each side."""
    atrium_mid = (atrium_start + atrium_end) // 2 - 1
    lanes = [atrium_mid]
    for low_end, high_end, sign in (
        (MARGIN, atrium_start - MARGIN, -1),
        (atrium_end + MARGIN, axis_size - MARGIN, 1),
    ):
        space = high_end - low_end
        if space < LEAF_MIN:
            continue
        n = rng.randint(1, 3) if space >= 24 else (1 if space >= 12 else 0)
        for i in range(n):
            slot = low_end + space * (i + 1) // (n + 1)
            jitter = rng.randint(-LANE_JITTER, LANE_JITTER)
            lanes.append(max(low_end + 1, min(high_end - HALL_WIDTH, slot + jitter)))
    lanes = sorted(set(lanes))
    out = [lanes[0]]
    for v in lanes[1:]:
        if v - out[-1] >= LEAF_MIN:
            out.append(v)
    return out


def _gap_segments(
    occupied: list[tuple[int, int]], lo: int, hi: int,
) -> list[tuple[int, int]]:
    """Given a set of [start, end) occupied ranges, return the empty
    gaps between them within [lo, hi). Used to slice the map into
    room-block strips between hallway lanes and the atrium."""
    spans = sorted(occupied)
    cur = lo
    out: list[tuple[int, int]] = []
    for s, e in spans:
        if s > cur:
            out.append((cur, s))
        cur = max(cur, e)
    if cur < hi:
        out.append((cur, hi))
    return [(s, e) for s, e in out if e - s >= LEAF_MIN]


def _paint_rect(grid: list[int], layout: Layout, r: Rect, kind: int) -> None:
    gw, gh = grid_size()
    for yy in range(max(0, r.y), min(gh, r.y + r.h)):
        for xx in range(max(0, r.x), min(gw, r.x + r.w)):
            if grid[yy * gw + xx] == EMPTY:
                grid[yy * gw + xx] = kind
    if kind == CORRIDOR:
        layout.hallways.append(r)


def _bsp_split_block(
    rng: random.Random, x0: int, y0: int, x1: int, y1: int,
) -> list[tuple[Rect, list[Direction]]]:
    """Return (leaf_rect, sides_facing_outside_corridor) per leaf. The
    `sides` list records which sides border the block boundary (= a main
    hallway), useful when picking doors."""
    bw, bh = x1 - x0, y1 - y0

    def sides_at_block(r: Rect) -> list[Direction]:
        ss: list[Direction] = []
        if r.y == y0: ss.append("N")
        if r.y + r.h == y1: ss.append("S")
        if r.x == x0: ss.append("W")
        if r.x + r.w == x1: ss.append("E")
        return ss

    leaves: list[tuple[Rect, list[Direction]]] = []

    def go(r: Rect, depth: int) -> None:
        long_axis = max(r.w, r.h)
        if long_axis < BLOCK_BSP_THRESHOLD or depth >= 2:
            leaves.append((r, sides_at_block(r)))
            return
        if depth >= 1 and rng.random() < 0.35:
            leaves.append((r, sides_at_block(r)))
            return
        vertical = (r.w >= r.h)
        if vertical and r.w >= LEAF_MIN * 2 + HALL_WIDTH:
            cut = rng.randint(LEAF_MIN, r.w - LEAF_MIN - HALL_WIDTH)
            go(Rect(r.x, r.y, cut, r.h), depth + 1)
            go(Rect(r.x + cut + HALL_WIDTH, r.y,
                    r.w - cut - HALL_WIDTH, r.h), depth + 1)
        elif r.h >= LEAF_MIN * 2 + HALL_WIDTH:
            cut = rng.randint(LEAF_MIN, r.h - LEAF_MIN - HALL_WIDTH)
            go(Rect(r.x, r.y, r.w, cut), depth + 1)
            go(Rect(r.x, r.y + cut + HALL_WIDTH, r.w,
                    r.h - cut - HALL_WIDTH), depth + 1)
        else:
            leaves.append((r, sides_at_block(r)))

    go(Rect(x0, y0, bw, bh), 0)
    return leaves


def _paint_spurs(
    grid: list[int], layout: Layout, leaves: list[tuple[Rect, list[Direction]]],
    x0: int, y0: int, x1: int, y1: int,
) -> None:
    """For any sub-block boundaries that don't touch the outer hallway,
    paint a 2-wide spur along the boundary so interior rooms have
    corridor access."""
    spans: set[tuple[int, int, int, int]] = set()
    for rect, _ in leaves:
        if rect.y > y0:
            spans.add((rect.x, rect.y - HALL_WIDTH, rect.w, HALL_WIDTH))
        if rect.y + rect.h < y1:
            spans.add((rect.x, rect.y + rect.h, rect.w, HALL_WIDTH))
        if rect.x > x0:
            spans.add((rect.x - HALL_WIDTH, rect.y, HALL_WIDTH, rect.h))
        if rect.x + rect.w < x1:
            spans.add((rect.x + rect.w, rect.y, HALL_WIDTH, rect.h))
    for x, y, w, h in spans:
        _paint_rect(grid, layout, Rect(x, y, w, h), CORRIDOR)


def _place_room(
    grid: list[int], layout: Layout, rng: random.Random,
    rect: Rect, sides: list[Direction],
) -> None:
    if rect.w < ROOM_PAD * 2 + 3 or rect.h < ROOM_PAD * 2 + 3:
        return
    room_rect = Rect(rect.x + ROOM_PAD, rect.y + ROOM_PAD,
                     rect.w - 2 * ROOM_PAD, rect.h - 2 * ROOM_PAD)
    paint(grid, room_rect, ROOM)
    side: Direction = rng.choice(sides) if sides else "N"
    if side == "N":
        dx, dy = room_rect.x + room_rect.w // 2, room_rect.y - 1
    elif side == "S":
        dx, dy = room_rect.x + room_rect.w // 2, room_rect.y + room_rect.h
    elif side == "E":
        dx, dy = room_rect.x + room_rect.w, room_rect.y + room_rect.h // 2
    else:
        dx, dy = room_rect.x - 1, room_rect.y + room_rect.h // 2
    gw, gh = grid_size()
    if not (0 <= dx < gw and 0 <= dy < gh):
        return
    grid[dy * gw + dx] = DOOR
    room = Room(rect=room_rect, archetype=_pick_archetype(rng), front_dir=side)
    room.door_x = (dx + 0.5) * CELL_SIZE
    room.door_z = (dy + 0.5) * CELL_SIZE
    if side in ("N", "S"):
        room.door_w = ((dx + 0.5) - (room_rect.x + room_rect.w / 2)) * CELL_SIZE
    else:
        room.door_w = ((dy + 0.5) - (room_rect.y + room_rect.h / 2)) * CELL_SIZE
    layout.rooms.append(room)
    layout.doors.append((room.door_x, room.door_z))


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

    h_lanes = _lane_positions(rng, gh, ay, ay + ATRIUM_SIZE)
    v_lanes = _lane_positions(rng, gw, ax, ax + ATRIUM_SIZE)

    for hy in h_lanes:
        _paint_rect(grid, layout,
                    Rect(MARGIN, hy, gw - 2 * MARGIN, HALL_WIDTH), CORRIDOR)
    for vx in v_lanes:
        _paint_rect(grid, layout,
                    Rect(vx, MARGIN, HALL_WIDTH, gh - 2 * MARGIN), CORRIDOR)

    y_occupied = [(hy, hy + HALL_WIDTH) for hy in h_lanes] + [(ay, ay + ATRIUM_SIZE)]
    x_occupied = [(vx, vx + HALL_WIDTH) for vx in v_lanes] + [(ax, ax + ATRIUM_SIZE)]
    y_segments = _gap_segments(y_occupied, MARGIN, gh - MARGIN)
    x_segments = _gap_segments(x_occupied, MARGIN, gw - MARGIN)

    for y0, y1 in y_segments:
        for x0, x1 in x_segments:
            leaves = _bsp_split_block(rng, x0, y0, x1, y1)
            _paint_spurs(grid, layout, leaves, x0, y0, x1, y1)
            for leaf_rect, sides in leaves:
                _place_room(grid, layout, rng, leaf_rect, sides)

    layout.cells = [1 if t != EMPTY else 0 for t in grid]
    return layout
