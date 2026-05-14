"""Per-tick teacher ability events.

Movement lives in `teacher_ai.py`; this module owns the *event* side: each
teacher carries a cooldown timer that decides when their ranged or area
ability fires. The dispatch of the actual effect (projectile spawn, slow
puddle, popup, ...) is handled by `app.services.abilities` — we just emit
an AbilityEvent describing what should happen."""
from __future__ import annotations

import time as _time
from dataclasses import dataclass

from app.world.teachers import TeacherState, line_of_sight

# Each entry: (cooldown_s, range_m). range_m=0 means "no proximity check".
# Only abilities listed here fire periodic events; the rest are passives.
ABILITY_EVENTS: dict[str, tuple[float, float]] = {
    "potion_throw":      (5.5, 14.0),
    "math_popup":        (14.0, 12.0),
    "grammar_blur":      (16.0, 16.0),
    "french_ui":         (18.0, 16.0),
    "fine_slow":         (10.0, 13.0),
    "lawsuit_stun":      (10.0, 13.0),
    "dodgeball_throw":   (4.0, 12.0),   # quick + cheap, light stun
    "shotput_throw":     (12.0, 9.0),   # heavy + slow, big stun
    "basketball_throw":  (7.0, 14.0),   # mid range, brief stun + slow
    "room_teleport":   (16.0, 0.0),
    "short_teleport":  (8.0, 0.0),
    "gravity_flip":    (20.0, 16.0),
    "relock_laptop":   (18.0, 0.0),
    "kill_flashlight": (9.0, 11.0),
    "fake_ping":       (20.0, 0.0),
    "vent_lockout":    (25.0, 0.0),
    "corrupt_tasks":   (22.0, 0.0),
    "lights_off":      (10.0, 0.0),
    "taunt_shout":     (15.0, 0.0),
    "equation_aura":   (0.0, 0.0),  # passive — handled per-tick by main
    "minimap_xray":    (0.0, 0.0),  # passive — chase radius only
    "time_warp":       (0.0, 0.0),
}


# Abilities that need a clear straight line to the target — otherwise the
# thrown thing would fly through walls.
PROJECTILE_ABILITIES = {
    "potion_throw", "lawsuit_stun",
    "dodgeball_throw", "shotput_throw", "basketball_throw",
}


@dataclass
class AbilityEvent:
    teacher_id: str
    ability: str
    x: float
    z: float
    target_id: str | None = None


def collect_events(
    teachers: list[TeacherState],
    players: list[tuple[str, float, float]],  # (id, x, z)
    dt: float,
    cells: list[int] | None = None,
    width: int = 120,  # noqa: ARG001 — kept for caller back-compat
    height: int = 120,  # noqa: ARG001
) -> list[AbilityEvent]:
    """Advance per-teacher event timers; return events that fired this tick.

    Only event-driven abilities are considered; passive abilities are no-ops
    here. Range checks pick the nearest player as the target."""
    out: list[AbilityEvent] = []
    now = _time.monotonic()
    for t in teachers:
        if t.stun_until > now:
            continue
        cfg = ABILITY_EVENTS.get(t.ability)
        if cfg is None:
            continue
        cd_s, rng_m = cfg
        if cd_s <= 0.0:
            continue
        t.cooldown_t += dt
        if t.cooldown_t < cd_s:
            continue
        target: str | None = None
        if rng_m > 0.0 and players:
            best = min(players, key=lambda p: (p[1] - t.x) ** 2 + (p[2] - t.z) ** 2)
            d2 = (best[1] - t.x) ** 2 + (best[2] - t.z) ** 2
            if d2 > rng_m * rng_m:
                # No one in range — stay ready and recheck on the next tick.
                t.cooldown_t = cd_s
                continue
            if cells is not None and t.ability in PROJECTILE_ABILITIES:
                if not line_of_sight(cells, t.x, t.z, best[1], best[2]):
                    t.cooldown_t = cd_s
                    continue
            target = best[0]
        t.cooldown_t = 0.0
        out.append(AbilityEvent(
            teacher_id=t.id, ability=t.ability,
            x=t.x, z=t.z, target_id=target,
        ))
    return out
