"""BSP floor plan generator.

Recursively splits the playable area into rectangles (a BSP tree). Each
leaf becomes a room. Sibling subtrees connect via a 2-wide L-corridor
joining their centres, so the corridor network grows bottom-up as a
tree — every junction is a clean 2x2 join because each corridor is a
single straight-rect paint, not a path of overlapping 2x2 blocks. The
atrium is anchored at the centre after rooms are placed."""
from __future__ import annotations

import random
from dataclasses import dataclass

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
MARGIN = 4
LEAF_MIN_W = 9
LEAF_MIN_H = 9
LEAF_MAX_DEPTH = 5
ROOM_INSET = 1

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


@dataclass
class _Node:
    rect: Rect
    children: tuple["_Node", "_Node"] | None = None


def _split(rng: random.Random, rect: Rect, depth: int) -> _Node:
    too_small = rect.w < LEAF_MIN_W * 2 + 2 and rect.h < LEAF_MIN_H * 2 + 2
    if depth >= LEAF_MAX_DEPTH or too_small:
        return _Node(rect)
    if depth >= 2 and rng.random() < 0.15:
        return _Node(rect)
    can_v = rect.w >= LEAF_MIN_W * 2 + 2
    can_h = rect.h >= LEAF_MIN_H * 2 + 2
    if can_v and can_h:
        vertical = rect.w >= rect.h if abs(rect.w - rect.h) > 4 else rng.random() < 0.5
    else:
        vertical = can_v
    if vertical:
        cut = rng.randint(LEAF_MIN_W + 1, rect.w - LEAF_MIN_W - 1)
        a = Rect(rect.x, rect.y, cut, rect.h)
        b = Rect(rect.x + cut, rect.y, rect.w - cut, rect.h)
    else:
        cut = rng.randint(LEAF_MIN_H + 1, rect.h - LEAF_MIN_H - 1)
        a = Rect(rect.x, rect.y, rect.w, cut)
        b = Rect(rect.x, rect.y + cut, rect.w, rect.h - cut)
    return _Node(rect, (_split(rng, a, depth + 1), _split(rng, b, depth + 1)))


def _paint_corridor_rect(
    grid: list[int], layout: Layout, r: Rect,
) -> None:
    gw, gh = grid_size()
    for yy in range(max(0, r.y), min(gh, r.y + r.h)):
        for xx in range(max(0, r.x), min(gw, r.x + r.w)):
            if grid[yy * gw + xx] == EMPTY:
                grid[yy * gw + xx] = CORRIDOR
    layout.hallways.append(r)


def _connect(
    grid: list[int], layout: Layout, a: tuple[int, int], b: tuple[int, int],
) -> None:
    """2-wide L-corridor: vertical leg first, then horizontal."""
    ax, ay = a
    bx, by = b
    ymin, ymax = min(ay, by), max(ay, by)
    xmin, xmax = min(ax, bx), max(ax, bx)
    _paint_corridor_rect(grid, layout, Rect(ax, ymin, 2, ymax - ymin + 2))
    _paint_corridor_rect(grid, layout, Rect(xmin, by, xmax - xmin + 2, 2))


def _carve(
    grid: list[int], layout: Layout, rng: random.Random,
    node: _Node, atrium: Rect,
) -> tuple[int, int]:
    """Recurse into the BSP tree. Returns a (x, y) corridor anchor for
    the subtree — used by the parent to wire siblings together."""
    if node.children is None:
        room = _place_leaf_room(grid, layout, rng, node.rect, atrium)
        if room is None:
            return (node.rect.x + node.rect.w // 2,
                    node.rect.y + node.rect.h // 2)
        return _door_corridor_anchor(room)
    a = _carve(grid, layout, rng, node.children[0], atrium)
    b = _carve(grid, layout, rng, node.children[1], atrium)
    _connect(grid, layout, a, b)
    return a


def _door_corridor_anchor(room: Room) -> tuple[int, int]:
    dx = int(room.door_x / CELL_SIZE)
    dz = int(room.door_z / CELL_SIZE)
    if room.front_dir == "N":
        return (dx, dz - 1)
    if room.front_dir == "S":
        return (dx, dz + 1)
    if room.front_dir == "E":
        return (dx + 1, dz)
    return (dx - 1, dz)


def _rects_overlap(a: Rect, b: Rect, pad: int = 0) -> bool:
    return not (a.x + a.w + pad <= b.x or b.x + b.w + pad <= a.x
                or a.y + a.h + pad <= b.y or b.y + b.h + pad <= a.y)


def _place_leaf_room(
    grid: list[int], layout: Layout, rng: random.Random,
    leaf: Rect, atrium: Rect,
) -> Room | None:
    rect = Rect(leaf.x + ROOM_INSET, leaf.y + ROOM_INSET,
                leaf.w - 2 * ROOM_INSET, leaf.h - 2 * ROOM_INSET)
    if rect.w < 4 or rect.h < 4:
        return None
    if _rects_overlap(rect, atrium, pad=1):
        return None
    paint(grid, rect, ROOM)
    ax = atrium.x + atrium.w // 2
    ay = atrium.y + atrium.h // 2
    cx = rect.x + rect.w // 2
    cy = rect.y + rect.h // 2
    if abs(cx - ax) > abs(cy - ay):
        if cx < ax:
            dx, dy, side = rect.x + rect.w, cy, "E"
        else:
            dx, dy, side = rect.x - 1, cy, "W"
    else:
        if cy < ay:
            dx, dy, side = cx, rect.y + rect.h, "S"
        else:
            dx, dy, side = cx, rect.y - 1, "N"
    gw, gh = grid_size()
    if not (0 <= dx < gw and 0 <= dy < gh):
        return None
    grid[dy * gw + dx] = DOOR
    room = Room(rect=rect, archetype=_pick_archetype(rng), front_dir=side)
    room.door_x = (dx + 0.5) * CELL_SIZE
    room.door_z = (dy + 0.5) * CELL_SIZE
    if side in ("N", "S"):
        room.door_w = ((dx + 0.5) - (rect.x + rect.w / 2)) * CELL_SIZE
    else:
        room.door_w = ((dy + 0.5) - (rect.y + rect.h / 2)) * CELL_SIZE
    layout.rooms.append(room)
    layout.doors.append((room.door_x, room.door_z))
    return room


def build_layout(rng: random.Random, width: int = 120, height: int = 120) -> Layout:
    set_grid(width, height)
    gw, gh = grid_size()
    grid = [EMPTY] * (gw * gh)
    layout = Layout(width=gw, height=gh)

    ax = (gw - ATRIUM_SIZE) // 2
    ay = (gh - ATRIUM_SIZE) // 2
    atrium = Rect(ax, ay, ATRIUM_SIZE, ATRIUM_SIZE)
    layout.atrium = atrium

    root = _split(rng, Rect(MARGIN, MARGIN,
                            gw - 2 * MARGIN, gh - 2 * MARGIN), 0)
    root_anchor = _carve(grid, layout, rng, root, atrium)

    paint(grid, atrium, CORRIDOR)
    layout.hallways.append(atrium)
    _connect(grid, layout, root_anchor,
             (atrium.x + atrium.w // 2 - 1, atrium.y + atrium.h // 2 - 1))

    layout.cells = [1 if t != EMPTY else 0 for t in grid]
    return layout
