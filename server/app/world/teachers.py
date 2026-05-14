"""Teacher AI orchestrator.

Owns `TeacherState`, the cell-grid context (line-of-sight + walkable
checks), and the per-tick loop that delegates to `teacher_ai.step_teacher`.
Spawn placement lives in `teacher_spawn`, ability events in
`teacher_events`, roster data in `teacher_roster`.

Re-exports `spawn_teachers`, `TEACHER_ROSTER`, `AbilityEvent`, and
`collect_events` so existing import sites (`from app.world.teachers import
…`) keep working."""
from __future__ import annotations

import math
import random
import time as _time
from dataclasses import dataclass, field

from app.schemas.world import Teacher
from app.world.constants import CELL_SIZE
from app.world.layout import Rect


@dataclass
class TeacherState:
    id: str
    image: str
    name: str
    subject: str
    ability: str
    x: float
    z: float
    tx: float
    tz: float
    cooldown_t: float = 0.0
    stun_until: float = 0.0
    # BFS-planned waypoint chain (world coords). Empty = needs replanning,
    # or means we're currently in greedy-steering mode (LOS to target).
    path: list[tuple[float, float]] = field(default_factory=list)
    last_repath_t: float = 0.0


# Width/height of the cell grid currently being processed. Set at the start
# of every tick / collect_events / spawn_teachers call so per-lobby grid
# dimensions stay consistent within a single synchronous pass.
_GW = 120
_GH = 120


def _set_grid(w: int, h: int) -> None:
    global _GW, _GH
    _GW, _GH = w, h


def get_grid_dims() -> tuple[int, int]:
    """Read the grid dimensions set by the last `_set_grid` call. Used by
    AI helpers that need bounds but don't have a direct grid handle."""
    return _GW, _GH


def _walkable(cells: list[int], x: float, z: float) -> bool:
    cx = int(x / CELL_SIZE)
    cz = int(z / CELL_SIZE)
    if not (0 <= cx < _GW and 0 <= cz < _GH):
        return False
    return cells[cz * _GW + cx] == 1


def line_of_sight(cells: list[int], x1: float, z1: float, x2: float, z2: float) -> bool:
    """True iff a straight line between the two points stays inside walkable
    cells. Used both to gate ranged abilities and to switch teacher AI from
    BFS to direct greedy steering when the path is clear."""
    dx, dz = x2 - x1, z2 - z1
    dist = math.hypot(dx, dz)
    if dist < 0.01:
        return True
    step = CELL_SIZE * 0.4  # ~half-cell so we don't skip past thin walls
    n = max(2, int(dist / step) + 1)
    for i in range(1, n):  # skip endpoints; they sit on walkable tiles
        t = i / n
        if not _walkable(cells, x1 + dx * t, z1 + dz * t):
            return False
    return True


def to_dto(t: TeacherState) -> Teacher:
    return Teacher(
        id=t.id, image=t.image, name=t.name,
        subject=t.subject, ability=t.ability, x=t.x, z=t.z,
    )


def tick(
    teachers: list[TeacherState],
    cells: list[int],
    hallways: list[Rect],
    player_positions: list[tuple[float, float]],
    dt: float,
    rng: random.Random,
    doors: list[tuple[float, float]] | None = None,
    width: int = 120,
    height: int = 120,
) -> None:
    """Advance every non-stunned teacher one AI step."""
    from app.world.teacher_ai import step_teacher

    _set_grid(width, height)
    now = _time.monotonic()
    door_list = doors or []
    for t in teachers:
        if t.stun_until > now:
            continue
        step_teacher(t, cells, hallways, player_positions, dt, rng, door_list, now)


# Back-compat re-exports — callers used to import these directly from
# this module. Keeping them here means we don't have to chase every import
# site every time the internal layout changes.
from app.world.teacher_events import (  # noqa: E402
    AbilityEvent, ABILITY_EVENTS, PROJECTILE_ABILITIES, collect_events,
)
from app.world.teacher_roster import TEACHER_ROSTER, TEACHERS_PER_GAME  # noqa: E402
from app.world.teacher_spawn import spawn_teachers  # noqa: E402

__all__ = [
    "TeacherState", "spawn_teachers", "to_dto", "tick",
    "line_of_sight", "get_grid_dims",
    "AbilityEvent", "ABILITY_EVENTS", "PROJECTILE_ABILITIES", "collect_events",
    "TEACHER_ROSTER", "TEACHERS_PER_GAME",
]
