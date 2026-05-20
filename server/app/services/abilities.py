"""Teacher ability resolution: turn AbilityEvents into broadcasts + side effects.

Each ability falls into one of:
- Projectile throw with on-impact effect (delayed stun/slow/puddle)
- Movement/state change on the teacher (teleport, hop)
- World-state change (laptop relock, vent lockout)
- Pure client-side VFX (math_popup, gravity_flip, ...)

Delayed effects + tuning constants live in `_abilities_effects.py`.
"""
from __future__ import annotations

import asyncio
import math
import random
import time as _time

from app.domain.lobby import Lobby, PlayerConn
from app.services._abilities_effects import (
    CIRCUIT_STUN_DURATION,
    FINE_SLOW_DURATION, FINE_SLOW_FACTOR,
    LAWSUIT_THROW_TRAVEL_MS,
    POTION_DURATION, POTION_RADIUS, POTION_SLOW_FACTOR, POTION_TRAVEL_MS,
    PUDDLES, STUN_DURATION, THROWS, VENT_LOCK_DURATION,
    delayed_puddle, delayed_slow, delayed_stun,
)
from app.services.broadcast import broadcast
from app.world.constants import CELL_SIZE
from app.world.geom import distance_squared
from app.world.teachers import AbilityEvent, TeacherState


def _pick_random_room_point(
    lobby: Lobby, rng: random.Random,
) -> tuple[float, float] | None:
    if not lobby.hallway_rects:
        return None
    rect = rng.choice(lobby.hallway_rects)
    cx = rng.uniform(rect.x + 0.5, rect.x + rect.w - 0.5)
    cz = rng.uniform(rect.y + 0.5, rect.y + rect.h - 0.5)
    return cx * CELL_SIZE, cz * CELL_SIZE


async def _relock_random_laptop(lobby: Lobby, by_teacher: str) -> str | None:
    """Mark a random completed casino spot as undone; return its laptop id."""
    assert lobby.world is not None
    for obj in lobby.world.objectives:
        if obj.kind != "casino":
            continue
        candidates = [s for s in obj.spots if s.done]
        if not candidates:
            return None
        s = random.choice(candidates)
        s.done = False
        obj.done = False
        if lobby.phase == "escape":
            lobby.phase = "tasks"
            await broadcast(lobby, {"type": "phase_change", "phase": "tasks"})
        await broadcast(lobby, {
            "type": "spot_relocked", "id": obj.id, "tag": s.tag, "by": by_teacher,
        })
        return s.tag
    return None


def _find_player(lobby: Lobby, pid: str) -> PlayerConn | None:
    return lobby.conns.get(pid)


async def apply_ability_events(
    lobby: Lobby, events: list[AbilityEvent], rng: random.Random,
) -> None:
    """Resolve each event into server-state changes + a broadcast packet."""
    now = _time.monotonic()
    teacher_by_id: dict[str, TeacherState] = {t.id: t for t in lobby.teachers}

    for ev in events:
        pkt: dict = {
            "type": "teacher_ability", "id": ev.teacher_id,
            "ability": ev.ability, "x": ev.x, "z": ev.z,
        }
        if ev.target_id:
            pkt["targetId"] = ev.target_id

        if ev.ability == "potion_throw" and ev.target_id:
            tgt = _find_player(lobby, ev.target_id)
            if tgt is None:
                continue
            travel = POTION_TRAVEL_MS / 1000.0
            asyncio.create_task(delayed_puddle(
                lobby, tgt.x, tgt.z, POTION_RADIUS,
                POTION_DURATION, POTION_SLOW_FACTOR, travel,
            ))
            pkt["payload"] = {
                "fromX": ev.x, "fromZ": ev.z,
                "targetX": tgt.x, "targetZ": tgt.z,
                "radius": POTION_RADIUS, "duration": POTION_DURATION,
                "travelMs": POTION_TRAVEL_MS,
            }

        elif ev.ability == "lawsuit_stun" and ev.target_id:
            tgt = _find_player(lobby, ev.target_id)
            if tgt is None:
                continue
            travel = LAWSUIT_THROW_TRAVEL_MS / 1000.0
            asyncio.create_task(delayed_stun(lobby, tgt.id, STUN_DURATION, travel))
            pkt["payload"] = {
                "targetX": tgt.x, "targetZ": tgt.z,
                "travelMs": LAWSUIT_THROW_TRAVEL_MS,
                "stunDuration": STUN_DURATION,
            }

        elif ev.ability in THROWS and ev.target_id:
            tgt = _find_player(lobby, ev.target_id)
            if tgt is None:
                continue
            travel_ms, stun_s, slow_s, slow_f = THROWS[ev.ability]
            travel = travel_ms / 1000.0
            if stun_s > 0:
                asyncio.create_task(delayed_stun(lobby, tgt.id, stun_s, travel))
            if slow_s > 0:
                asyncio.create_task(delayed_slow(lobby, tgt.id, slow_f, slow_s, travel))
            pkt["payload"] = {
                "targetX": tgt.x, "targetZ": tgt.z, "travelMs": travel_ms,
            }

        elif ev.ability in PUDDLES and ev.target_id:
            tgt = _find_player(lobby, ev.target_id)
            if tgt is None:
                continue
            radius, duration, factor, travel_ms = PUDDLES[ev.ability]
            travel = travel_ms / 1000.0
            asyncio.create_task(delayed_puddle(
                lobby, tgt.x, tgt.z, radius, duration, factor, travel,
            ))
            pkt["payload"] = {
                "fromX": ev.x, "fromZ": ev.z,
                "targetX": tgt.x, "targetZ": tgt.z,
                "radius": radius, "duration": duration,
                "travelMs": travel_ms,
            }

        elif ev.ability == "circuit_overload" and ev.target_id:
            tgt = _find_player(lobby, ev.target_id)
            if tgt is None:
                continue
            tgt.stun_until = now + CIRCUIT_STUN_DURATION
            pkt["payload"] = {"stunDuration": CIRCUIT_STUN_DURATION}

        elif ev.ability == "fine_slow" and ev.target_id:
            tgt = _find_player(lobby, ev.target_id)
            if tgt is None:
                continue
            tgt.slow_until = now + FINE_SLOW_DURATION
            tgt.slow_factor = FINE_SLOW_FACTOR
            pkt["payload"] = {"duration": FINE_SLOW_DURATION, "factor": FINE_SLOW_FACTOR}

        elif ev.ability == "room_teleport":
            t = teacher_by_id.get(ev.teacher_id)
            pt = _pick_random_room_point(lobby, rng)
            if t is not None and pt is not None:
                t.x, t.z = pt
                t.tx, t.tz = pt
                pkt["payload"] = {"toX": pt[0], "toZ": pt[1]}

        elif ev.ability == "short_teleport":
            t = teacher_by_id.get(ev.teacher_id)
            if t is not None:
                alive = [p for p in lobby.conns.values()
                         if p.id not in lobby.dead and p.id not in lobby.extracted]
                if alive:
                    nearest = min(alive, key=lambda p: distance_squared(p, t))
                    dx, dz = nearest.x - t.x, nearest.z - t.z
                    d = math.hypot(dx, dz) or 1.0
                    t.x += dx / d * 5.0
                    t.z += dz / d * 5.0
                    t.tx, t.tz = t.x, t.z
                    pkt["payload"] = {"toX": t.x, "toZ": t.z}

        elif ev.ability == "relock_laptop":
            await _relock_random_laptop(lobby, ev.teacher_id)

        elif ev.ability == "vent_lockout":
            lobby.extraction_locked_until = now + VENT_LOCK_DURATION
            pkt["payload"] = {"duration": VENT_LOCK_DURATION}

        # else: pure client-side VFX — broadcast only.
        await broadcast(lobby, pkt)
