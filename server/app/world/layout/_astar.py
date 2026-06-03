"""A* pathfinder over 2x2 block positions on the layout grid.

A "block" is the top-left coordinate of a 2x2 cell square. Each step
moves the whole 2x2 block by one cell. Result: every carved corridor is
exactly 2 cells wide, since every painted block covers a 2x2 footprint."""
from __future__ import annotations

import heapq

from app.world.layout._types import CORRIDOR, EMPTY, grid_size


def block_in_grid(b: tuple[int, int]) -> bool:
    gw, gh = grid_size()
    x, y = b
    return 0 <= x and x + 2 <= gw and 0 <= y and y + 2 <= gh


def block_passable(
    grid: list[int], b: tuple[int, int], halo: set[tuple[int, int]],
) -> bool:
    if not block_in_grid(b):
        return False
    gw, _ = grid_size()
    x, y = b
    for dx in (0, 1):
        for dy in (0, 1):
            cx, cy = x + dx, y + dy
            if (cx, cy) in halo:
                return False
            t = grid[cy * gw + cx]
            if t != EMPTY and t != CORRIDOR:
                return False
    return True


def astar_2x2(
    grid: list[int], start: tuple[int, int], goal: tuple[int, int],
    halo: set[tuple[int, int]],
) -> list[tuple[int, int]] | None:
    """A* over 2x2 block positions. Each node = top-left of a 2x2 block."""
    if not block_passable(grid, start, halo) or not block_passable(grid, goal, halo):
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
            if not block_passable(grid, nb, halo):
                continue
            ng = g + 1
            if ng < cost.get(nb, 1 << 30):
                cost[nb] = ng
                came[nb] = cur
                heapq.heappush(pq, (ng + heur(nb, goal), ng, nb))
    return None
