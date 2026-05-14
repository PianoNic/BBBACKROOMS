"""Phase 3+4: MST-based corridor carving using 2x2 block A*."""
from __future__ import annotations

import random

from app.world.layout._astar import astar_2x2
from app.world.layout._types import (
    CORRIDOR,
    EMPTY,
    Direction,
    Layout,
    Rect,
    Room,
    grid_size,
)


def approach_block(door: tuple[int, int, Direction]) -> tuple[int, int]:
    """The 2x2 corridor cell just past the door, away from the room.
    Returns the block's top-left coordinate."""
    dx, dy, side = door
    if side == "N":
        return (dx, dy - 2)
    if side == "S":
        return (dx, dy + 1)
    if side == "E":
        return (dx + 1, dy)
    return (dx - 2, dy)


def atrium_door_pairs(
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
    cx = atrium.x + atrium.w // 2
    cy = atrium.y + atrium.h // 2
    return [
        (cx - 1, atrium.y - 3),                          # N
        (cx - 1, atrium.y + atrium.h + 1),               # S
        (atrium.x + atrium.w + 1, cy - 1),               # E
        (atrium.x - 3, cy - 1),                          # W
    ]


def _block_run_rect(start: tuple[int, int], end: tuple[int, int]) -> Rect:
    sx = min(start[0], end[0])
    sy = min(start[1], end[1])
    ex = max(start[0], end[0])
    ey = max(start[1], end[1])
    return Rect(sx, sy, ex - sx + 2, ey - sy + 2)


def _paint_blocks(
    grid: list[int], path: list[tuple[int, int]], layout: Layout,
) -> None:
    gw, _ = grid_size()
    for x, y in path:
        for dx in (0, 1):
            for dy in (0, 1):
                cx, cy = x + dx, y + dy
                if grid[cy * gw + cx] == EMPTY:
                    grid[cy * gw + cx] = CORRIDOR
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


def _build_room_halo(
    rooms: list[Room], atrium: Rect,
) -> set[tuple[int, int]]:
    """Cells 4-orthogonal to any room wall — corridors must not enter.
    The atrium contributes its own halo too (minus its 4 door openings)
    so corridors can only touch the atrium through the 2-wide doorways."""
    gw, gh = grid_size()
    halo: set[tuple[int, int]] = set()
    rects = [room.rect for room in rooms] + [atrium]
    for r in rects:
        for x in range(r.x, r.x + r.w):
            for y in (r.y - 1, r.y + r.h):
                if 0 <= x < gw and 0 <= y < gh:
                    halo.add((x, y))
        for y in range(r.y, r.y + r.h):
            for x in (r.x - 1, r.x + r.w):
                if 0 <= x < gw and 0 <= y < gh:
                    halo.add((x, y))
    for pair in atrium_door_pairs(atrium).values():
        for cell in pair:
            halo.discard(cell)
    return halo


def connect_rooms(
    grid: list[int], layout: Layout, atrium: Rect,
    room_doors: list[tuple[Room, tuple[int, int, Direction]]],
    rng: random.Random,
) -> list[bool]:
    """Carve a corridor network: MST over (atrium approaches + room
    approaches) plus ~10% extra short cycle edges so the graph loops."""
    atrium_blocks = _atrium_approach_blocks(atrium)
    room_blocks = [approach_block(d) for _, d in room_doors]
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

    cycle_candidates: list[tuple[int, int, int]] = []
    for d, i, j in edges:
        if find(i) == find(j):
            cycle_candidates.append((d, i, j))
            continue
        path = astar_2x2(grid, nodes[i], nodes[j], halo)
        if path is None:
            continue
        _paint_blocks(grid, path, layout)
        union(i, j)

    for d, i, j in cycle_candidates[: max(1, n_total // 10)]:
        path = astar_2x2(grid, nodes[i], nodes[j], halo)
        if path is None:
            continue
        _paint_blocks(grid, path, layout)

    atrium_root = find(0)
    return [find(n_atrium + k) == atrium_root for k in range(n_total - n_atrium)]
