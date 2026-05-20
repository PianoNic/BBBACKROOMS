"""Run the tentacle generator across many seeds and report how many
rooms end up unreachable from the atrium. Pure diagnostic — no fix."""
from __future__ import annotations

import random
from collections import deque

from app.world.layout_tentacle import build_layout
from app.world.layout._types import CORRIDOR, DOOR, ROOM


def reachable_from_atrium(layout) -> set[tuple[int, int]]:
    gw, gh = layout.width, layout.height
    grid = layout.cells  # 1 = walkable, 0 = void
    seen: set[tuple[int, int]] = set()
    q: deque[tuple[int, int]] = deque()
    a = layout.atrium
    for y in range(a.y, a.y + a.h):
        for x in range(a.x, a.x + a.w):
            if grid[y * gw + x]:
                seen.add((x, y))
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < gw and 0 <= ny < gh and (nx, ny) not in seen:
                if grid[ny * gw + nx]:
                    seen.add((nx, ny))
                    q.append((nx, ny))
    return seen


def main() -> None:
    import sys
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    n_seeds = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    totals = {"rooms": 0, "disconnected_rooms": 0, "bad_seeds": 0}
    worst: tuple[int, int] | None = None
    for seed in range(n_seeds):
        rng = random.Random(seed)
        layout = build_layout(rng, width=size, height=size)
        reach = reachable_from_atrium(layout)
        bad = 0
        for room in layout.rooms:
            r = room.rect
            cells = [(x, y) for y in range(r.y, r.y + r.h)
                            for x in range(r.x, r.x + r.w)]
            if not any(c in reach for c in cells):
                bad += 1
        totals["rooms"] += len(layout.rooms)
        totals["disconnected_rooms"] += bad
        if bad:
            totals["bad_seeds"] += 1
            if worst is None or bad > worst[1]:
                worst = (seed, bad)
        print(f"seed={seed:3d}  rooms={len(layout.rooms):3d}  unreachable={bad}")
    print()
    print(f"seeds with disconnected rooms: {totals['bad_seeds']}/{n_seeds}")
    print(f"total unreachable rooms:       {totals['disconnected_rooms']}/{totals['rooms']}")
    if worst:
        print(f"worst seed: {worst[0]} ({worst[1]} disconnected)")


if __name__ == "__main__":
    main()
