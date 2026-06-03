"""Phase 1+2: BFS-place rooms outward from the atrium, then pick one door
per room on the side with the most surrounding EMPTY space."""
from __future__ import annotations

import random
from collections import deque

from app.world.constants import (
    CLASSROOM_DEPTH_MAX,
    CLASSROOM_DEPTH_MIN,
    CLASSROOM_WIDTH_MAX,
    CLASSROOM_WIDTH_MIN,
)
from app.world.layout._types import (
    ATRIUM_GAP,
    EMPTY,
    MAX_BFS_ROOMS,
    NEIGHBOR_TRIES,
    ROOM,
    ROOM_ARCHETYPES,
    ROOM_BUFFER,
    ROOM_GAP,
    Direction,
    Rect,
    Room,
    grid_size,
    paint,
    rect_all_empty,
)


def _pick_archetype(rng: random.Random) -> str:
    kinds, weights = zip(*ROOM_ARCHETYPES)
    return rng.choices(kinds, weights=weights)[0]


def _try_place(grid: list[int], rect: Rect, archetype: str) -> Room | None:
    if not rect_all_empty(grid, rect, pad=ROOM_BUFFER):
        return None
    paint(grid, rect, ROOM)
    return Room(rect=rect, archetype=archetype, front_dir="N")


def _try_neighbor(
    grid: list[int], src: Rect, side: Direction, gap: int, rng: random.Random,
) -> Room | None:
    """Place a room adjacent to `src` on `side`, separated by `gap` EMPTY
    cells. The new room's perpendicular offset is randomised so neighbours
    can fan out instead of stacking in a perfect line."""
    w = rng.randint(CLASSROOM_WIDTH_MIN, CLASSROOM_WIDTH_MAX)
    h = rng.randint(CLASSROOM_DEPTH_MIN, CLASSROOM_DEPTH_MAX)
    if side in ("N", "S"):
        lo = src.x - w + 2
        hi = src.x + src.w - 2
        if hi < lo:
            return None
        x = rng.randint(lo, hi)
        y = src.y - gap - h if side == "N" else src.y + src.h + gap
    else:
        lo = src.y - h + 2
        hi = src.y + src.h - 2
        if hi < lo:
            return None
        y = rng.randint(lo, hi)
        x = src.x - gap - w if side == "W" else src.x + src.w + gap
    return _try_place(grid, Rect(x, y, w, h), _pick_archetype(rng))


def place_outward(
    grid: list[int], atrium: Rect, rng: random.Random,
) -> list[Room]:
    """BFS from the atrium: each placed room tries to spawn neighbours on
    all 4 sides, those neighbours try the same, etc."""
    placed: list[Room] = []
    frontier: deque[Rect] = deque()
    for side in ("N", "S", "E", "W"):
        for _ in range(NEIGHBOR_TRIES * 2):
            room = _try_neighbor(grid, atrium, side, ATRIUM_GAP, rng)  # type: ignore[arg-type]
            if room is not None:
                placed.append(room)
                frontier.append(room.rect)
                break
    while frontier and len(placed) < MAX_BFS_ROOMS:
        src = frontier.popleft()
        sides = ["N", "S", "E", "W"]
        rng.shuffle(sides)
        for side in sides:
            for _ in range(NEIGHBOR_TRIES):
                room = _try_neighbor(grid, src, side, ROOM_GAP, rng)  # type: ignore[arg-type]
                if room is not None:
                    placed.append(room)
                    frontier.append(room.rect)
                    break
    return placed


def pick_door(
    grid: list[int], room: Room,
) -> tuple[int, int, Direction] | None:
    """Pick a single door cell on the side with the most surrounding EMPTY
    space. Returns (door_x, door_y, side) or None if every side is too
    cramped."""
    gw, gh = grid_size()
    r = room.rect

    def score_strip(xs: range, ys: range) -> int:
        s = 0
        for y in ys:
            for x in xs:
                if 0 <= x < gw and 0 <= y < gh:
                    if grid[y * gw + x] == EMPTY:
                        s += 1
        return s

    candidates: list[tuple[int, int, int, Direction]] = []
    if r.y - 1 >= 0:
        sc = score_strip(range(r.x, r.x + r.w), range(r.y - 3, r.y))
        candidates.append((sc, r.x + r.w // 2, r.y - 1, "N"))
    if r.y + r.h < gh:
        sc = score_strip(range(r.x, r.x + r.w), range(r.y + r.h, r.y + r.h + 3))
        candidates.append((sc, r.x + r.w // 2, r.y + r.h, "S"))
    if r.x - 1 >= 0:
        sc = score_strip(range(r.x - 3, r.x), range(r.y, r.y + r.h))
        candidates.append((sc, r.x - 1, r.y + r.h // 2, "W"))
    if r.x + r.w < gw:
        sc = score_strip(range(r.x + r.w, r.x + r.w + 3), range(r.y, r.y + r.h))
        candidates.append((sc, r.x + r.w, r.y + r.h // 2, "E"))
    candidates.sort(reverse=True)
    for score, dx, dy, side in candidates:
        if score < 4:
            continue
        return dx, dy, side
    return None
