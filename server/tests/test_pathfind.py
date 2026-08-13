"""Grid pathfinding used by the teacher AI (issue #50)."""
from __future__ import annotations

from app.world.pathfind import find_path_cells

W = H = 8


def open_grid() -> list[int]:
    return [1] * (W * H)


def contiguous(path: list[tuple[int, int]]) -> bool:
    """Every consecutive pair differs by exactly one 4-connected step."""
    return all(
        abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1
        for a, b in zip(path, path[1:])
    )


class TestBasicPaths:
    def test_path_is_inclusive_contiguous_and_walkable(self):
        cells = open_grid()
        path = find_path_cells(cells, W, H, (0, 0), (5, 3))

        assert path[0] == (0, 0)
        assert path[-1] == (5, 3)
        assert contiguous(path)
        assert all(cells[z * W + x] == 1 for x, z in path)

    def test_shortest_path_length_on_an_open_grid(self):
        # BFS on a 4-connected grid: length is the Manhattan distance + 1
        # (the start cell is included).
        path = find_path_cells(open_grid(), W, H, (1, 1), (4, 5))
        assert len(path) == (abs(4 - 1) + abs(5 - 1)) + 1

    def test_start_equals_goal(self):
        assert find_path_cells(open_grid(), W, H, (2, 2), (2, 2)) == [(2, 2)]

    def test_path_routes_around_a_wall(self):
        cells = open_grid()
        for z in range(0, H - 1):        # vertical wall with a gap at the bottom
            cells[z * W + 3] = 0
        path = find_path_cells(cells, W, H, (1, 1), (5, 1))

        assert path, "no route found although a gap exists"
        assert contiguous(path)
        assert all(cells[z * W + x] == 1 for x, z in path)
        # It has to detour to the gap rather than cut through the wall.
        assert len(path) > (abs(5 - 1) + 1)


class TestNoPath:
    def test_unreachable_goal_returns_empty(self):
        cells = open_grid()
        for z in range(H):               # full-height wall, no gap
            cells[z * W + 3] = 0
        assert find_path_cells(cells, W, H, (1, 1), (5, 1)) == []

    def test_start_on_a_wall_returns_empty(self):
        cells = open_grid()
        cells[1 * W + 1] = 0
        assert find_path_cells(cells, W, H, (1, 1), (5, 5)) == []

    def test_goal_on_a_wall_returns_empty(self):
        cells = open_grid()
        cells[5 * W + 5] = 0
        assert find_path_cells(cells, W, H, (1, 1), (5, 5)) == []

    def test_off_grid_coordinates_return_empty(self):
        cells = open_grid()
        assert find_path_cells(cells, W, H, (-1, 0), (5, 5)) == []
        assert find_path_cells(cells, W, H, (0, 0), (W, 0)) == []


class TestNoDiagonals:
    def test_a_diagonal_gap_is_not_squeezed_through(self):
        """Diagonal moves would let teachers clip through wall corners."""
        cells = open_grid()
        cells[0 * W + 1] = 0
        cells[1 * W + 0] = 0
        # (0,0) is now sealed off from the rest by a diagonal-only opening.
        assert find_path_cells(cells, W, H, (0, 0), (5, 5)) == []
