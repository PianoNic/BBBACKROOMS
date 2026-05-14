"""Floor plan: rooms-first, corridors-second, corridors always 2-wide.

Algorithm:
  1. Paint atrium in the centre as CORRIDOR.
  2. Place rooms greedily with `ROOM_BUFFER = 2` (gives at least 4 EMPTY
     cells between any two rooms: 1 wall + 2 corridor + 1 wall).
       a) one big room into each corner quadrant
       b) rooms hugging the outer walls
       c) heavy random scatter inside
  3. Pick one door cell per room — single entry on the side with the
     most EMPTY breathing space. Compute the door's `approach block`:
     the 2x2 corridor cell just past the door, away from the room.
  4. Build an MST over (atrium approaches + room approaches) using
     Manhattan distance between blocks. Add ~30% extra short edges so
     the graph has cycles.
  5. A* on 2x2 blocks — each step moves a whole 2x2 block by 1 cell.
     Result: corridors are always exactly 2-wide. Blocks may not include
     any room-halo cell (every room's wall has a 1-cell EMPTY buffer
     between it and any corridor; only the dedicated door cell punches
     through).
  6. Rooms that can't be reached are erased — the bitmap stays honest.
"""
from __future__ import annotations

import heapq
import random
from collections import deque
from dataclasses import dataclass, field
from typing import Literal

from app.world.constants import (
    CELL_SIZE,
    CLASSROOM_DEPTH_MAX,
    CLASSROOM_DEPTH_MIN,
    CLASSROOM_WIDTH_MAX,
    CLASSROOM_WIDTH_MIN,
)

Direction = Literal["N", "S", "E", "W"]

EMPTY = 0
CORRIDOR = 1
ROOM = 2
DOOR = 3

GRID_W = 120
GRID_H = 120
ATRIUM_SIZE = 8

ROOM_BUFFER = 2  # forces a 4-cell gap between rooms (2+2 buffers touching)
ATRIUM_GAP = 4  # rooms adjacent to atrium sit 4 cells away (1 wall + 2 corridor + 1 wall)
ROOM_GAP = 4   # rooms adjacent to other rooms sit 4 cells away

NEIGHBOR_TRIES = 8     # per side, per BFS step
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


# ---------- bitmap primitives ----------


def _paint(grid: list[int], r: Rect, value: int) -> None:
    for y in range(max(0, r.y), min(GRID_H, r.y + r.h)):
        for x in range(max(0, r.x), min(GRID_W, r.x + r.w)):
            grid[y * GRID_W + x] = value


def _rect_all_empty(grid: list[int], r: Rect, pad: int) -> bool:
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


# ---------- phase 1: room placement ----------


def _pick_archetype(rng: random.Random) -> str:
    kinds, weights = zip(*ROOM_ARCHETYPES)
    return rng.choices(kinds, weights=weights)[0]


def _try_place(
    grid: list[int], rect: Rect, archetype: str,
) -> Room | None:
    if not _rect_all_empty(grid, rect, pad=ROOM_BUFFER):
        return None
    _paint(grid, rect, ROOM)
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


def _place_outward(
    grid: list[int], atrium: Rect, rng: random.Random,
) -> list[Room]:
    """BFS from the atrium: each placed room tries to spawn neighbours in
    all 4 directions, those neighbours try the same, etc. Result is a
    blob of rooms emanating from the centre."""
    placed: list[Room] = []
    frontier: deque[Rect] = deque()
    # Seed: drop 4 rooms adjacent to atrium walls (gap = 2)
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


# ---------- phase 2: pick a door per room ----------


def _pick_door(
    grid: list[int], room: Room,
) -> tuple[int, int, Direction] | None:
    r = room.rect

    def score_strip(xs: range, ys: range) -> int:
        s = 0
        for y in ys:
            for x in xs:
                if 0 <= x < GRID_W and 0 <= y < GRID_H:
                    if grid[y * GRID_W + x] == EMPTY:
                        s += 1
        return s

    candidates: list[tuple[int, int, int, Direction]] = []
    if r.y - 1 >= 0:
        sc = score_strip(range(r.x, r.x + r.w), range(r.y - 3, r.y))
        candidates.append((sc, r.x + r.w // 2, r.y - 1, "N"))
    if r.y + r.h < GRID_H:
        sc = score_strip(range(r.x, r.x + r.w), range(r.y + r.h, r.y + r.h + 3))
        candidates.append((sc, r.x + r.w // 2, r.y + r.h, "S"))
    if r.x - 1 >= 0:
        sc = score_strip(range(r.x - 3, r.x), range(r.y, r.y + r.h))
        candidates.append((sc, r.x - 1, r.y + r.h // 2, "W"))
    if r.x + r.w < GRID_W:
        sc = score_strip(range(r.x + r.w, r.x + r.w + 3), range(r.y, r.y + r.h))
        candidates.append((sc, r.x + r.w, r.y + r.h // 2, "E"))
    candidates.sort(reverse=True)
    for score, dx, dy, side in candidates:
        if score < 4:
            continue
        return dx, dy, side
    return None


# ---------- phase 3: 2x2 block A* + paint ----------


def _approach_block(
    door: tuple[int, int, Direction],
) -> tuple[int, int]:
    """The 2x2 corridor cell just past the door, away from the room.
    Block top-left coordinate."""
    dx, dy, side = door
    if side == "N":
        return (dx, dy - 2)
    if side == "S":
        return (dx, dy + 1)
    if side == "E":
        return (dx + 1, dy)
    return (dx - 2, dy)


def _atrium_door_pairs(
    atrium: Rect,
) -> dict[Direction, tuple[tuple[int, int], tuple[int, int]]]:
    """The 2-wide opening per atrium wall, in the halo row/column just
    outside the atrium. Centred on each wall."""
    cx = atrium.x + atrium.w // 2
    cy = atrium.y + atrium.h // 2
    return {
        "N": ((cx - 1, atrium.y - 1), (cx, atrium.y - 1)),
        "S": ((cx - 1, atrium.y + atrium.h), (cx, atrium.y + atrium.h)),
        "E": ((atrium.x + atrium.w, cy - 1), (atrium.x + atrium.w, cy)),
        "W": ((atrium.x - 1, cy - 1), (atrium.x - 1, cy)),
    }


def _atrium_approach_blocks(atrium: Rect) -> list[tuple[int, int]]:
    """2x2 corridor blocks just past each atrium door opening, aligned
    with the door cells so the approach connects through the doorway."""
    cx = atrium.x + atrium.w // 2
    cy = atrium.y + atrium.h // 2
    return [
        (cx - 1, atrium.y - 3),                          # N
        (cx - 1, atrium.y + atrium.h + 1),               # S
        (atrium.x + atrium.w + 1, cy - 1),               # E
        (atrium.x - 3, cy - 1),                          # W
    ]


def _block_in_grid(b: tuple[int, int]) -> bool:
    x, y = b
    return 0 <= x and x + 2 <= GRID_W and 0 <= y and y + 2 <= GRID_H


def _block_passable(
    grid: list[int], b: tuple[int, int], halo: set[tuple[int, int]],
) -> bool:
    if not _block_in_grid(b):
        return False
    x, y = b
    for dx in (0, 1):
        for dy in (0, 1):
            cx, cy = x + dx, y + dy
            if (cx, cy) in halo:
                return False
            t = grid[cy * GRID_W + cx]
            if t != EMPTY and t != CORRIDOR:
                return False
    return True


def _astar_2x2(
    grid: list[int], start: tuple[int, int], goal: tuple[int, int],
    halo: set[tuple[int, int]],
) -> list[tuple[int, int]] | None:
    """A* over 2x2 block positions. Each node = top-left of a 2x2 block."""
    if not _block_passable(grid, start, halo) or not _block_passable(grid, goal, halo):
        return None

    def heur(a: tuple[int, int], b: tuple[int, int]) -> int:
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    pq: list[tuple[int, int, tuple[int, int]]] = [(heur(start, goal), 0, start)]
    came: dict[tuple[int, int], tuple[int, int] | None] = {start: None}
    cost: dict[tuple[int, int], int] = {start: 0}
    while pq:
        _, g, cur = heapq.heappop(pq)
        if cur == goal:
            path: list[tuple[int, int]] = [cur]
            while came[path[-1]] is not None:
                path.append(came[path[-1]])  # type: ignore[arg-type]
            return list(reversed(path))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = (cur[0] + dx, cur[1] + dy)
            if not _block_passable(grid, nb, halo):
                continue
            ng = g + 1
            if ng < cost.get(nb, 1 << 30):
                cost[nb] = ng
                came[nb] = cur
                heapq.heappush(pq, (ng + heur(nb, goal), ng, nb))
    return None


def _paint_blocks(
    grid: list[int], path: list[tuple[int, int]], layout: Layout,
) -> None:
    for x, y in path:
        for dx in (0, 1):
            for dy in (0, 1):
                cx, cy = x + dx, y + dy
                if grid[cy * GRID_W + cx] == EMPTY:
                    grid[cy * GRID_W + cx] = CORRIDOR
    # Emit one Rect per straight run of blocks.
    if len(path) < 2:
        return
    run_start = path[0]
    prev = path[0]
    prev_dir: tuple[int, int] | None = None
    for cur in path[1:]:
        d = (cur[0] - prev[0], cur[1] - prev[1])
        if prev_dir is not None and d != prev_dir:
            layout.hallways.append(_block_run_rect(run_start, prev))
            run_start = prev
        prev_dir = d
        prev = cur
    if prev_dir is not None:
        layout.hallways.append(_block_run_rect(run_start, prev))


def _block_run_rect(
    start: tuple[int, int], end: tuple[int, int],
) -> Rect:
    sx = min(start[0], end[0])
    sy = min(start[1], end[1])
    ex = max(start[0], end[0])
    ey = max(start[1], end[1])
    return Rect(sx, sy, ex - sx + 2, ey - sy + 2)


# ---------- phase 4: MST connect ----------


def _build_room_halo(
    rooms: list[Room], atrium: Rect,
) -> set[tuple[int, int]]:
    """Cells 4-orthogonal to any room wall — corridors must not enter.
    The atrium contributes its own halo too (minus its 4 door openings)
    so corridors can only touch the atrium through the 2-wide doorways."""
    halo: set[tuple[int, int]] = set()
    rects = [room.rect for room in rooms] + [atrium]
    for r in rects:
        for x in range(r.x, r.x + r.w):
            for y in (r.y - 1, r.y + r.h):
                if 0 <= x < GRID_W and 0 <= y < GRID_H:
                    halo.add((x, y))
        for y in range(r.y, r.y + r.h):
            for x in (r.x - 1, r.x + r.w):
                if 0 <= x < GRID_W and 0 <= y < GRID_H:
                    halo.add((x, y))
    # Punch the atrium door openings out of the halo so corridors can
    # actually reach the atrium through them.
    for pair in _atrium_door_pairs(atrium).values():
        for cell in pair:
            halo.discard(cell)
    return halo


def _connect_rooms(
    grid: list[int], layout: Layout, atrium: Rect,
    room_doors: list[tuple[Room, tuple[int, int, Direction]]],
    rng: random.Random,
) -> list[bool]:
    atrium_blocks = _atrium_approach_blocks(atrium)
    room_blocks = [_approach_block(d) for _, d in room_doors]
    nodes = atrium_blocks + room_blocks
    n_atrium = len(atrium_blocks)
    n_total = len(nodes)
    halo = _build_room_halo([r for r, _ in room_doors], atrium)

    parent = list(range(n_total))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a: int, b: int) -> bool:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        parent[ra] = rb
        return True

    for i in range(1, n_atrium):
        union(0, i)

    edges: list[tuple[int, int, int]] = []
    for i in range(n_total):
        for j in range(i + 1, n_total):
            d = abs(nodes[i][0] - nodes[j][0]) + abs(nodes[i][1] - nodes[j][1])
            edges.append((d, i, j))
    edges.sort()

    # Greedy spanning: for every edge in distance order, if its endpoints
    # are not yet in the same component, try A*. Only union on actual
    # carving success. Edges between same-component nodes are saved as
    # cycle candidates.
    cycle_candidates: list[tuple[int, int, int]] = []
    for d, i, j in edges:
        if find(i) == find(j):
            cycle_candidates.append((d, i, j))
            continue
        path = _astar_2x2(grid, nodes[i], nodes[j], halo)
        if path is None:
            continue
        _paint_blocks(grid, path, layout)
        union(i, j)

    # Add a few short cycle edges for loops (so the layout isn't a pure
    # tree). Budget ~10% of node count.
    for d, i, j in cycle_candidates[: max(1, n_total // 10)]:
        path = _astar_2x2(grid, nodes[i], nodes[j], halo)
        if path is None:
            continue
        _paint_blocks(grid, path, layout)

    atrium_root = find(0)
    return [find(n_atrium + k) == atrium_root for k in range(n_total - n_atrium)]


# ---------- public entry ----------


def _finalize_room(
    grid: list[int], room: Room, door: tuple[int, int, Direction],
    layout: Layout,
) -> None:
    dx, dy, side = door
    grid[dy * GRID_W + dx] = DOOR
    room.front_dir = side
    room.door_x = (dx + 0.5) * CELL_SIZE
    room.door_z = (dy + 0.5) * CELL_SIZE
    if side in ("N", "S"):
        room.door_w = ((dx + 0.5) - (room.rect.x + room.rect.w / 2)) * CELL_SIZE
    else:
        room.door_w = ((dy + 0.5) - (room.rect.y + room.rect.h / 2)) * CELL_SIZE
    layout.doors.append((room.door_x, room.door_z))


def build_layout(rng: random.Random, width: int = 120, height: int = 120) -> Layout:
    global GRID_W, GRID_H
    GRID_W, GRID_H = width, height
    grid = [EMPTY] * (GRID_W * GRID_H)
    layout = Layout(width=GRID_W, height=GRID_H)

    atrium = Rect(
        GRID_W // 2 - ATRIUM_SIZE // 2,
        GRID_H // 2 - ATRIUM_SIZE // 2,
        ATRIUM_SIZE, ATRIUM_SIZE,
    )
    _paint(grid, atrium, CORRIDOR)
    # Punch 4 doorways through the atrium's halo so corridors can connect.
    for pair in _atrium_door_pairs(atrium).values():
        for dx, dy in pair:
            if 0 <= dx < GRID_W and 0 <= dy < GRID_H:
                grid[dy * GRID_W + dx] = CORRIDOR
    layout.atrium = atrium
    layout.hallways.append(atrium)

    rooms = _place_outward(grid, atrium, rng)

    door_picks: list[tuple[Room, tuple[int, int, Direction]]] = []
    for room in rooms:
        d = _pick_door(grid, room)
        if d is None:
            _paint(grid, room.rect, EMPTY)
            continue
        door_picks.append((room, d))

    connected = _connect_rooms(grid, layout, atrium, door_picks, rng)

    for (room, door), ok in zip(door_picks, connected):
        if not ok:
            _paint(grid, room.rect, EMPTY)
            continue
        _finalize_room(grid, room, door, layout)
        layout.rooms.append(room)

    # Remove corridors that ended up disconnected from the atrium (their
    # rooms were orphans and got erased; the carved path between them is
    # a dead stub).
    _erase_orphan_corridors(grid, atrium, layout)

    layout.cells = [1 if t != EMPTY else 0 for t in grid]
    return layout


def _erase_orphan_corridors(
    grid: list[int], atrium: Rect, layout: Layout,
) -> None:
    start = (atrium.x + atrium.w // 2, atrium.y + atrium.h // 2)
    seen: set[tuple[int, int]] = {start}
    queue: deque[tuple[int, int]] = deque([start])
    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < GRID_W and 0 <= ny < GRID_H):
                continue
            if (nx, ny) in seen:
                continue
            t = grid[ny * GRID_W + nx]
            if t == CORRIDOR or t == DOOR:
                seen.add((nx, ny))
                queue.append((nx, ny))
    for y in range(GRID_H):
        for x in range(GRID_W):
            if grid[y * GRID_W + x] == CORRIDOR and (x, y) not in seen:
                grid[y * GRID_W + x] = EMPTY
    # Drop hallway rects whose cells are now all EMPTY.
    kept: list[Rect] = []
    for h in layout.hallways:
        for y in range(h.y, h.y + h.h):
            ok = False
            for x in range(h.x, h.x + h.w):
                if 0 <= x < GRID_W and 0 <= y < GRID_H:
                    if grid[y * GRID_W + x] == CORRIDOR:
                        ok = True
                        break
            if ok:
                kept.append(h)
                break
    layout.hallways = kept
