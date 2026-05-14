"""Grid pathfinding for the teacher AI.

Plain BFS on the 4-connected walkable cell grid — every step costs the same
on a tile world, so BFS gives the optimal shortest path with no heuristic
tuning. A 180×180 grid is ~32k cells worst case; one BFS finishes in well
under a millisecond. Teachers re-plan a few times per second, so this is
cheap enough to run per-teacher every tick if we ever needed to."""
from __future__ import annotations

from collections import deque

# 4-connected neighbours (no diagonals — keeps paths from cutting corners
# through wall cells, and the school grid is already chunky enough that
# diagonal moves don't read as natural).
_STEPS: tuple[tuple[int, int], ...] = ((1, 0), (-1, 0), (0, 1), (0, -1))


def find_path_cells(
    cells: list[int], width: int, height: int,
    start: tuple[int, int], goal: tuple[int, int],
) -> list[tuple[int, int]]:
    """Shortest path from `start` to `goal` over walkable cells.

    Returns the list of cells from start to goal *inclusive*. Empty list
    means unreachable, off-grid, or start/goal sit on a wall. The caller
    is responsible for converting cell coords back to world coords."""
    sx, sz = start
    gx, gz = goal
    if not _walkable_cell(cells, width, height, sx, sz):
        return []
    if not _walkable_cell(cells, width, height, gx, gz):
        return []
    if start == goal:
        return [start]

    start_idx = sz * width + sx
    goal_idx = gz * width + gx
    # parent[i] = index of the cell we came from; root has parent -1.
    parent: dict[int, int] = {start_idx: -1}
    queue: deque[int] = deque([start_idx])
    while queue:
        idx = queue.popleft()
        if idx == goal_idx:
            return _backtrack(parent, idx, width)
        cz = idx // width
        cx = idx - cz * width
        for dx, dz in _STEPS:
            nx, nz = cx + dx, cz + dz
            if not (0 <= nx < width and 0 <= nz < height):
                continue
            n = nz * width + nx
            if n in parent or cells[n] != 1:
                continue
            parent[n] = idx
            queue.append(n)
    return []


def _walkable_cell(cells: list[int], width: int, height: int, cx: int, cz: int) -> bool:
    if not (0 <= cx < width and 0 <= cz < height):
        return False
    return cells[cz * width + cx] == 1


def _backtrack(parent: dict[int, int], idx: int, width: int) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    cur = idx
    while cur != -1:
        cz = cur // width
        cx = cur - cz * width
        out.append((cx, cz))
        cur = parent[cur]
    out.reverse()
    return out
