"""Public entry: orchestrate all phases and clean up unreachable rooms."""
from __future__ import annotations

import random
from collections import deque

from app.world.constants import CELL_SIZE
from app.world.layout._corridors import atrium_door_pairs, connect_rooms
from app.world.layout._rooms import pick_door, place_outward
from app.world.layout._types import (
    ATRIUM_SIZE,
    CORRIDOR,
    DOOR,
    EMPTY,
    Direction,
    Layout,
    Rect,
    Room,
    grid_size,
    paint,
    set_grid,
)


def build_layout(rng: random.Random, width: int = 120, height: int = 120) -> Layout:
    set_grid(width, height)
    gw, gh = grid_size()
    grid = [EMPTY] * (gw * gh)
    layout = Layout(width=gw, height=gh)

    atrium = Rect(
        gw // 2 - ATRIUM_SIZE // 2,
        gh // 2 - ATRIUM_SIZE // 2,
        ATRIUM_SIZE, ATRIUM_SIZE,
    )
    paint(grid, atrium, CORRIDOR)
    # Punch 4 doorways through the atrium's halo so corridors can connect.
    for pair in atrium_door_pairs(atrium).values():
        for dx, dy in pair:
            if 0 <= dx < gw and 0 <= dy < gh:
                grid[dy * gw + dx] = CORRIDOR
    layout.atrium = atrium
    layout.hallways.append(atrium)

    rooms = place_outward(grid, atrium, rng)

    door_picks: list[tuple[Room, tuple[int, int, Direction]]] = []
    for room in rooms:
        d = pick_door(grid, room)
        if d is None:
            paint(grid, room.rect, EMPTY)
            continue
        door_picks.append((room, d))

    connected = connect_rooms(grid, layout, atrium, door_picks, rng)

    for (room, door), ok in zip(door_picks, connected):
        if not ok:
            paint(grid, room.rect, EMPTY)
            continue
        _finalize_room(grid, room, door, layout)
        layout.rooms.append(room)

    _erase_orphan_corridors(grid, atrium, layout)

    layout.cells = [1 if t != EMPTY else 0 for t in grid]
    return layout


def _finalize_room(
    grid: list[int], room: Room, door: tuple[int, int, Direction],
    layout: Layout,
) -> None:
    gw, _ = grid_size()
    dx, dy, side = door
    grid[dy * gw + dx] = DOOR
    room.front_dir = side
    room.door_x = (dx + 0.5) * CELL_SIZE
    room.door_z = (dy + 0.5) * CELL_SIZE
    if side in ("N", "S"):
        room.door_w = ((dx + 0.5) - (room.rect.x + room.rect.w / 2)) * CELL_SIZE
    else:
        room.door_w = ((dy + 0.5) - (room.rect.y + room.rect.h / 2)) * CELL_SIZE
    layout.doors.append((room.door_x, room.door_z))


def _erase_orphan_corridors(
    grid: list[int], atrium: Rect, layout: Layout,
) -> None:
    """Flood-fill corridors from the atrium centre; anything not reached
    is a stub left by an erased orphan room — return it to EMPTY."""
    gw, gh = grid_size()
    start = (atrium.x + atrium.w // 2, atrium.y + atrium.h // 2)
    seen: set[tuple[int, int]] = {start}
    queue: deque[tuple[int, int]] = deque([start])
    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < gw and 0 <= ny < gh):
                continue
            if (nx, ny) in seen:
                continue
            t = grid[ny * gw + nx]
            if t == CORRIDOR or t == DOOR:
                seen.add((nx, ny))
                queue.append((nx, ny))
    for y in range(gh):
        for x in range(gw):
            if grid[y * gw + x] == CORRIDOR and (x, y) not in seen:
                grid[y * gw + x] = EMPTY
    # Drop hallway rects whose cells are now all EMPTY.
    kept: list[Rect] = []
    for h in layout.hallways:
        for y in range(h.y, h.y + h.h):
            ok = False
            for x in range(h.x, h.x + h.w):
                if 0 <= x < gw and 0 <= y < gh:
                    if grid[y * gw + x] == CORRIDOR:
                        ok = True
                        break
            if ok:
                kept.append(h)
                break
    layout.hallways = kept
