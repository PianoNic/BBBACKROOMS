"""Teacher spawn placement.

One teacher per map quadrant, placed on the walkable cell furthest from
the player spawn within that quadrant. With three teachers we cover the
three most-distant quadrants, leaving one as a "safe" early-game
direction. Atrium cells are excluded so no teacher lands in the hub."""
from __future__ import annotations

import random
import secrets

from app.world.constants import CELL_SIZE
from app.world.layout import Rect
from app.world.teacher_events import ABILITY_EVENTS
from app.world.teacher_roster import TEACHER_ROSTER, TEACHERS_PER_GAME
from app.world.teachers import TeacherState, _set_grid


def spawn_teachers(
    cells: list[int],
    rng: random.Random | None = None,
    selected_images: list[str] | None = None,
    width: int = 120,
    height: int = 120,
    avoid_x: float = 0.0,
    avoid_z: float = 0.0,
    atrium: Rect | None = None,
) -> list[TeacherState]:
    """Spawn each teacher in a different map quadrant, picking the walkable
    cell that lies furthest from the player spawn within that quadrant. With
    three teachers we cover three of the four quadrants, giving players one
    "safe" direction for the early game while ensuring no teacher starts
    near the centre."""
    _set_grid(width, height)
    rng = rng or random.Random()
    roster = _pick_roster(rng, selected_images)
    spots = _corner_spawn_points(
        cells, width, height, atrium, avoid_x, avoid_z, len(roster),
    ) or [(width // 2, height // 2)] * len(roster)
    rng.shuffle(spots)
    out: list[TeacherState] = []
    for i, (image, name, subject, ability) in enumerate(roster):
        cx, cz = spots[i % len(spots)]
        x = (cx + 0.5) * CELL_SIZE
        z = (cz + 0.5) * CELL_SIZE
        # Pre-warm the cooldown so the first ability fires a few seconds
        # after game start instead of after a full cooldown.
        cfg = ABILITY_EVENTS.get(ability)
        prewarm = max(0.0, cfg[0] - 3.0) if cfg and cfg[0] > 0 else 0.0
        out.append(TeacherState(
            id=secrets.token_hex(3), image=image, name=name,
            subject=subject, ability=ability,
            x=x, z=z, tx=x, tz=z, cooldown_t=prewarm,
        ))
    return out


def _pick_roster(
    rng: random.Random, selected_images: list[str] | None,
) -> list[tuple[str, str, str, str]]:
    pool = [r for r in TEACHER_ROSTER if not selected_images or r[0] in selected_images]
    if not pool:
        pool = list(TEACHER_ROSTER)
    if len(pool) >= TEACHERS_PER_GAME:
        return rng.sample(pool, TEACHERS_PER_GAME)
    return [rng.choice(pool) for _ in range(TEACHERS_PER_GAME)]


def _corner_spawn_points(
    cells: list[int], width: int, height: int,
    atrium: Rect | None, avoid_x: float, avoid_z: float, count: int,
) -> list[tuple[int, int]]:
    """Pick one walkable cell per quadrant (NW, NE, SW, SE), choosing the
    cell that maximises distance from the player spawn. Returns up to
    `count` spots, ordered by descending distance so the most-distant
    quadrants are preferred when count < 4."""
    walkable = _walkable_cells(cells, width, height, atrium)
    if not walkable:
        return []
    mx, mz = width / 2, height / 2
    quadrants: dict[tuple[int, int], list[tuple[int, int]]] = {
        (0, 0): [], (1, 0): [], (0, 1): [], (1, 1): [],
    }
    for (cx, cz) in walkable:
        quadrants[(1 if cx >= mx else 0, 1 if cz >= mz else 0)].append((cx, cz))

    def dist_sq(c: tuple[int, int]) -> float:
        return (
            ((c[0] + 0.5) * CELL_SIZE - avoid_x) ** 2
            + ((c[1] + 0.5) * CELL_SIZE - avoid_z) ** 2
        )

    picks = [max(qc, key=dist_sq) for qc in quadrants.values() if qc]
    picks.sort(key=dist_sq, reverse=True)
    return picks[:count]


def _walkable_cells(
    cells: list[int], width: int, height: int, atrium: Rect | None,
) -> list[tuple[int, int]]:
    ax0 = atrium.x if atrium is not None else 0
    ax1 = atrium.x + atrium.w if atrium is not None else 0
    az0 = atrium.y if atrium is not None else 0
    az1 = atrium.y + atrium.h if atrium is not None else 0
    out: list[tuple[int, int]] = []
    for cz in range(height):
        for cx in range(width):
            if cells[cz * width + cx] != 1:
                continue
            if atrium is not None and ax0 <= cx < ax1 and az0 <= cz < az1:
                continue
            out.append((cx, cz))
    return out
