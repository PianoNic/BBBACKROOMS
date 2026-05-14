"""Hide pickup items inside lockers.

Items no longer spawn on bare floor — they live inside `Locker` containers
spread across classrooms. Most lockers are empty (atmosphere: players search
through them). The spawn counts still scale with map size so a large map
gets more total items, just as before."""
from __future__ import annotations

import random

from app.domain.lobby import Locker
from app.world.constants import SCALE_REFERENCE_CELLS

# Per-pickup spawn rules. `base` = count on the reference-size (120²) map;
# the actual count scales with the map's cell-area but is clamped to
# [floor, hard_cap] so a tiny map gets at least one of each and a huge
# map can't drown in items.
SPAWN_RULES: dict[str, dict[str, int]] = {
    "medkit":  {"base": 3, "floor": 1, "hard_cap": 5},
    "potion":  {"base": 2, "floor": 1, "hard_cap": 4},
    "compass": {"base": 2, "floor": 1, "hard_cap": 3},
    "tracker": {"base": 1, "floor": 1, "hard_cap": 2},
    "goggles": {"base": 1, "floor": 1, "hard_cap": 2},
    "gps":     {"base": 1, "floor": 1, "hard_cap": 1},
}


def _scaled_count(rule: dict[str, int], side: int) -> int:
    scaled = round(rule["base"] * side / SCALE_REFERENCE_CELLS)
    return max(rule["floor"], min(rule["hard_cap"], scaled))


def fill_lockers(lockers: list[Locker], side: int, rng: random.Random) -> None:
    """Pick lockers at random and stash one item per chosen locker."""
    if not lockers:
        return
    pool = lockers[:]
    rng.shuffle(pool)
    cursor = 0
    for kind, rule in SPAWN_RULES.items():
        target = _scaled_count(rule, side)
        for _ in range(target):
            if cursor >= len(pool):
                return  # ran out of lockers — silently cap
            pool[cursor].item = kind
            cursor += 1
