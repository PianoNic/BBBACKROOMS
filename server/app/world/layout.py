"""Floor plan via a typed bitmap.

Each cell holds exactly one tile type (EMPTY / CORRIDOR / ROOM / DOOR). Every
placement is rejected unless its target cells are EMPTY, so rooms and corridors
can never overlap. The external `layout.cells` is the binary walkable mask
derived from the bitmap at the end.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Literal

from app.world.constants import (
    CELL_SIZE,
    CLASSROOM_DEPTH_MAX,
    CLASSROOM_DEPTH_MIN,
    CLASSROOM_WIDTH_MAX,
    CLASSROOM_WIDTH_MIN,
    HALL_THICKNESS,
    MARGIN,
)

Direction = Literal["N", "S", "E", "W"]

EMPTY = 0
CORRIDOR = 1
ROOM = 2
DOOR = 3

# Mutable per-generation grid dimensions. build_layout() sets these before
# any helper runs; runtime code (teacher AI, chair physics) reads
# `world.grid.width/height` instead so it works across multiple lobbies.
GRID_W = 120
GRID_H = 120

ATRIUM_SIZE = 8
MAX_CORRIDOR_LENGTH = 24
BRANCH_LENGTH_MIN = 10
BRANCH_LENGTH_MAX = MAX_CORRIDOR_LENGTH
BRANCHES_PER_CORRIDOR_MIN = 1
BRANCHES_PER_CORRIDOR_MAX = 3
MAX_BRANCH_DEPTH = 3
BRANCH_TRIES = 16
ROOM_ARCHETYPES = (
    ("classroom", 5),
    ("teacher_room", 3),
    ("toilet", 2),
    ("gym", 1),
    ("cafeteria", 1),
    ("janitor_room", 1),
    ("server_room", 1),
)


@dataclass
class Rect:
    x: int
    y: int
    w: int
    h: int


@dataclass
class Room:
    rect: Rect
    archetype: str
    front_dir: Direction
    door_w: float = 0.0
    # World-space center of the doorway cell. Used by services that want to
    # spawn an interactable Door panel for this room (currently classrooms).
    door_x: float = 0.0
    door_z: float = 0.0


@dataclass
class Layout:
    cells: list[int] = field(default_factory=list)
    width: int = GRID_W
    height: int = GRID_H
    hallways: list[Rect] = field(default_factory=list)
    atrium: Rect | None = None
    rooms: list[Room] = field(default_factory=list)
    # World-space center of every doorway, in CELL_SIZE units. Used by the
    # teacher AI to keep them from camping directly at room entrances.
    doors: list[tuple[float, float]] = field(default_factory=list)


def _paint(grid: list[int], r: Rect, value: int) -> None:
    for y in range(max(0, r.y), min(GRID_H, r.y + r.h)):
        for x in range(max(0, r.x), min(GRID_W, r.x + r.w)):
            grid[y * GRID_W + x] = value


def _all_empty(grid: list[int], r: Rect, pad: int = 0) -> bool:
    """Every cell inside r ± pad is in-grid and EMPTY."""
    for y in range(r.y - pad, r.y + r.h + pad):
        for x in range(r.x - pad, r.x + r.w + pad):
            if not (0 <= x < GRID_W and 0 <= y < GRID_H):
                return False
            if grid[y * GRID_W + x] != EMPTY:
                return False
    return True


def _corridor_clear(grid: list[int], r: Rect, horizontal: bool) -> bool:
    """Interior all EMPTY, plus the two long-side wall rows are EMPTY.

    The corridor's two short ends are NOT checked — that's where it attaches
    to a parent corridor, so they're expected to be CORRIDOR cells.
    """
    if not _all_empty(grid, r, pad=0):
        return False
    if horizontal:
        for x in range(r.x, r.x + r.w):
            for y in (r.y - 1, r.y + r.h):
                if 0 <= y < GRID_H and 0 <= x < GRID_W:
                    if grid[y * GRID_W + x] != EMPTY:
                        return False
    else:
        for y in range(r.y, r.y + r.h):
            for x in (r.x - 1, r.x + r.w):
                if 0 <= y < GRID_H and 0 <= x < GRID_W:
                    if grid[y * GRID_W + x] != EMPTY:
                        return False
    return True


def _in_bounds(r: Rect) -> bool:
    return (
        r.x >= MARGIN
        and r.y >= MARGIN
        and r.x + r.w <= GRID_W - MARGIN
        and r.y + r.h <= GRID_H - MARGIN
    )


def _pick_archetype(rng: random.Random) -> str:
    kinds, weights = zip(*ROOM_ARCHETYPES)
    return rng.choices(kinds, weights=weights)[0]


def _tile_classrooms(
    grid: list[int], layout: Layout, hall: Rect, horizontal: bool, rng: random.Random
) -> None:
    """Tile rooms along both sides of `hall`. Strictly bitmap-checked."""
    along_start = hall.x if horizontal else hall.y
    along_len = hall.w if horizontal else hall.h

    for side in (-1, 1):
        p = along_start
        end = along_start + along_len
        while p < end - CLASSROOM_WIDTH_MIN:
            along = min(rng.randint(CLASSROOM_WIDTH_MIN, CLASSROOM_WIDTH_MAX), end - p)
            depth = rng.randint(CLASSROOM_DEPTH_MIN, CLASSROOM_DEPTH_MAX)
            door_along = rng.randint(1, along - 2) if along >= 4 else (along - 1) // 2

            if horizontal:
                ry = hall.y - 1 - depth if side == -1 else hall.y + hall.h + 1
                rect = Rect(p + 1, ry, along - 1, depth)
                door_x = p + door_along
                door_y = hall.y - 1 if side == -1 else hall.y + hall.h
                front: Direction = "N" if side == -1 else "S"
            else:
                rx = hall.x - 1 - depth if side == -1 else hall.x + hall.w + 1
                rect = Rect(rx, p + 1, depth, along - 1)
                door_x = hall.x - 1 if side == -1 else hall.x + hall.w
                door_y = p + door_along
                front = "W" if side == -1 else "E"

            if not _in_bounds(rect) or not _all_empty(grid, rect, pad=1):
                p += along + 1
                continue

            _paint(grid, rect, ROOM)
            grid[door_y * GRID_W + door_x] = DOOR
            layout.doors.append(((door_x + 0.5) * CELL_SIZE, (door_y + 0.5) * CELL_SIZE))

            if horizontal:
                door_w = ((door_x + 0.5) - (rect.x + rect.w / 2)) * CELL_SIZE
            else:
                door_w = ((door_y + 0.5) - (rect.y + rect.h / 2)) * CELL_SIZE

            layout.rooms.append(
                Room(
                    rect=rect, archetype=_pick_archetype(rng), front_dir=front,
                    door_w=door_w,
                    door_x=(door_x + 0.5) * CELL_SIZE,
                    door_z=(door_y + 0.5) * CELL_SIZE,
                )
            )
            p += along + 1


def _make_wings(atrium: Rect) -> list[tuple[Rect, bool]]:
    th = HALL_THICKNESS
    cx = atrium.x + atrium.w // 2 - th // 2
    cy = atrium.y + atrium.h // 2 - th // 2
    north_len = min(MAX_CORRIDOR_LENGTH, atrium.y - MARGIN)
    south_len = min(MAX_CORRIDOR_LENGTH, GRID_H - MARGIN - (atrium.y + atrium.h))
    west_len = min(MAX_CORRIDOR_LENGTH, atrium.x - MARGIN)
    east_len = min(MAX_CORRIDOR_LENGTH, GRID_W - MARGIN - (atrium.x + atrium.w))
    return [
        (Rect(cx, atrium.y - north_len, th, north_len), False),
        (Rect(cx, atrium.y + atrium.h, th, south_len), False),
        (Rect(atrium.x - west_len, cy, west_len, th), True),
        (Rect(atrium.x + atrium.w, cy, east_len, th), True),
    ]


def _try_branch(
    grid: list[int], parent: Rect, parent_horiz: bool, rng: random.Random
) -> Rect | None:
    """Propose a perpendicular branch whose every cell is EMPTY (no crossings)."""
    th = HALL_THICKNESS
    branch_horiz = not parent_horiz
    for _ in range(BRANCH_TRIES):
        length = rng.randint(BRANCH_LENGTH_MIN, BRANCH_LENGTH_MAX)
        side = rng.choice([-1, 1])
        if parent_horiz:
            if parent.w < th + 4:
                return None
            bx = rng.randint(parent.x + 1, parent.x + parent.w - th - 1)
            child = (
                Rect(bx, parent.y - length, th, length)
                if side == -1
                else Rect(bx, parent.y + parent.h, th, length)
            )
        else:
            if parent.h < th + 4:
                return None
            by = rng.randint(parent.y + 1, parent.y + parent.h - th - 1)
            child = (
                Rect(parent.x - length, by, length, th)
                if side == -1
                else Rect(parent.x + parent.w, by, length, th)
            )
        if not _in_bounds(child):
            continue
        if not _corridor_clear(grid, child, branch_horiz):
            continue
        return child
    return None


def _grow(
    grid: list[int],
    layout: Layout,
    hall: Rect,
    horizontal: bool,
    rng: random.Random,
    depth: int,
) -> None:
    _tile_classrooms(grid, layout, hall, horizontal, rng)
    if depth <= 0:
        return
    n = rng.randint(BRANCHES_PER_CORRIDOR_MIN, BRANCHES_PER_CORRIDOR_MAX)
    for _ in range(n):
        child = _try_branch(grid, hall, horizontal, rng)
        if child is None:
            continue
        _paint(grid, child, CORRIDOR)
        layout.hallways.append(child)
        _grow(grid, layout, child, not horizontal, rng, depth - 1)


def build_layout(rng: random.Random, width: int = 120, height: int = 120) -> Layout:
    global GRID_W, GRID_H
    GRID_W, GRID_H = width, height
    grid = [EMPTY] * (GRID_W * GRID_H)
    layout = Layout(width=GRID_W, height=GRID_H)

    atrium = Rect(
        GRID_W // 2 - ATRIUM_SIZE // 2,
        GRID_H // 2 - ATRIUM_SIZE // 2,
        ATRIUM_SIZE,
        ATRIUM_SIZE,
    )
    _paint(grid, atrium, CORRIDOR)
    layout.atrium = atrium
    layout.hallways.append(atrium)

    for wing, horizontal in _make_wings(atrium):
        if max(wing.w, wing.h) < CLASSROOM_WIDTH_MIN + 2 or min(wing.w, wing.h) < 1:
            continue
        if not _corridor_clear(grid, wing, horizontal):
            continue
        _paint(grid, wing, CORRIDOR)
        layout.hallways.append(wing)
        _grow(grid, layout, wing, horizontal, rng, MAX_BRANCH_DEPTH)

    layout.cells = [1 if t != EMPTY else 0 for t in grid]
    return layout
