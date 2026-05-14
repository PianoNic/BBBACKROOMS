"""Shared types, constants, and bitmap primitives for layout generation."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Direction = Literal["N", "S", "E", "W"]

EMPTY = 0
CORRIDOR = 1
ROOM = 2
DOOR = 3

GRID_W = 120
GRID_H = 120
ATRIUM_SIZE = 8

ROOM_BUFFER = 2  # forces a 4-cell gap between rooms (2+2 buffers touching)
ATRIUM_GAP = 4   # rooms adjacent to atrium sit 4 cells away
ROOM_GAP = 4     # rooms adjacent to other rooms sit 4 cells away

NEIGHBOR_TRIES = 8
MAX_BFS_ROOMS = 200

ROOM_ARCHETYPES = (
    ("classroom", 6),
    ("teacher_room", 3),
    ("toilet", 2),
    ("janitor_room", 1),
    ("gym", 1),
    ("cafeteria", 1),
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
    doors: list[tuple[float, float]] = field(default_factory=list)


# `build_layout` mutates these to honour the requested grid size.
def set_grid(width: int, height: int) -> None:
    global GRID_W, GRID_H
    GRID_W, GRID_H = width, height


def grid_size() -> tuple[int, int]:
    return GRID_W, GRID_H


# ---------- bitmap primitives ----------


def paint(grid: list[int], r: Rect, value: int) -> None:
    for y in range(max(0, r.y), min(GRID_H, r.y + r.h)):
        for x in range(max(0, r.x), min(GRID_W, r.x + r.w)):
            grid[y * GRID_W + x] = value


def rect_all_empty(grid: list[int], r: Rect, pad: int) -> bool:
    """Rect itself must fit and be EMPTY. The pad buffer may extend off
    the map (the bitmap edge already acts as a wall)."""
    if r.x < 0 or r.y < 0 or r.x + r.w > GRID_W or r.y + r.h > GRID_H:
        return False
    for y in range(r.y - pad, r.y + r.h + pad):
        for x in range(r.x - pad, r.x + r.w + pad):
            if not (0 <= x < GRID_W and 0 <= y < GRID_H):
                continue
            if grid[y * GRID_W + x] != EMPTY:
                return False
    return True
