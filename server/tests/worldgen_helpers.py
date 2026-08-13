"""Grid helpers shared by the worldgen tests."""
from __future__ import annotations

from collections import deque

from app.world.constants import CELL_SIZE

WALKABLE = 1


def cell_of(x: float, z: float) -> tuple[int, int]:
    """World coordinates -> cell coordinates, the same way the services do."""
    return int(x / CELL_SIZE), int(z / CELL_SIZE)


def is_walkable(cells: list[int], width: int, height: int, cx: int, cz: int) -> bool:
    if not (0 <= cx < width and 0 <= cz < height):
        return False
    return cells[cz * width + cx] == WALKABLE


def reachable_from(
    cells: list[int], width: int, height: int, start: tuple[int, int],
) -> set[tuple[int, int]]:
    """Flood fill of walkable cells, 4-connected — matching `pathfind`."""
    sx, sz = start
    if not is_walkable(cells, width, height, sx, sz):
        return set()
    seen = {(sx, sz)}
    queue = deque([(sx, sz)])
    while queue:
        cx, cz = queue.popleft()
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nxt = (cx + dx, cz + dz)
            if nxt in seen or not is_walkable(cells, width, height, *nxt):
                continue
            seen.add(nxt)
            queue.append(nxt)
    return seen


def nearest_walkable(
    cells: list[int], width: int, height: int, cx: int, cz: int, radius: int = 3,
) -> tuple[int, int] | None:
    """Closest walkable cell to (cx, cz) within `radius`.

    Props and their interact spots are placed *against* walls, so a spot's own
    cell is often solid — what matters for reachability is that a player can
    stand next to it.
    """
    if is_walkable(cells, width, height, cx, cz):
        return cx, cz
    best: tuple[int, int] | None = None
    best_d = None
    for dz in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            nx, nz = cx + dx, cz + dz
            if not is_walkable(cells, width, height, nx, nz):
                continue
            d = dx * dx + dz * dz
            if best_d is None or d < best_d:
                best_d, best = d, (nx, nz)
    return best
