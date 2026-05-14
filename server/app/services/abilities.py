"""Teacher ability resolution: turn AbilityEvents into broadcasts + side effects.

Each ability falls into one of:
- Projectile throw with on-impact effect (delayed stun/slow/puddle)
- Movement/state change on the teacher (teleport, hop)
- World-state change (laptop relock, vent lockout)
- Pure client-side VFX (math_popup, gravity_flip, ...)
"""
from __future__ import annotations

import asyncio
import math
import random
import time as _time

from app.domain.lobby import Lobby, PlayerConn
from app.services.broadcast import broadcast
from app.world.constants import CELL_SIZE
from app.world.geom import distance_squared
from app.world.teachers import AbilityEvent, TeacherState


# Ability tuning ---------------------------------------------------------------
POTION_RADIUS = 2.0
POTION_DURATION = 6.0
POTION_SLOW_FACTOR = 0.5
POTION_TRAVEL_MS = 750
STUN_DURATION = 1.0
FINE_SLOW_DURATION = 2.5
FINE_SLOW_FACTOR = 0.6
LAWSUIT_THROW_TRAVEL_MS = 700
VENT_LOCK_DURATION = 12.0

# Per-throw tuning: (travelMs, stun_s, slow_s, slow_factor).
THROWS: dict[str, tuple[int, float, float, float]] = {
    "dodgeball_throw":  (450, 0.6, 0.0, 1.0),
    "shotput_throw":    (900, 1.6, 2.0, 0.65),
    "basketball_throw": (650, 0.4, 1.5, 0.7),
}


# Delayed effect tasks ---------------------------------------------------------

async def _delayed_stun(
    lobby: Lobby, player_id: str, duration: float, delay: float,
) -> None:
    await asyncio.sleep(delay)
    p = lobby.conns.get(player_id)
    if p is None or p.id in lobby.dead or p.id in lobby.extracted:
        return
    p.stun_until = _time.monotonic() + duration


async def _delayed_slow(
    lobby: Lobby, player_id: str, factor: float, duration: float, delay: float,
) -> None:
    await asyncio.sleep(delay)
    p = lobby.conns.get(player_id)
    if p is None or p.id in lobby.dead or p.id in lobby.extracted:
        return
    now = _time.monotonic()
    p.slow_until = max(p.slow_until, now + duration)
    if p.slow_factor > factor:
        p.slow_factor = factor


async def _delayed_puddle(
    lobby: Lobby, x: float, z: float, radius: float,
    duration: float, factor: float, delay: float,
) -> None:
    await asyncio.sleep(delay)
    if lobby.status != "running":
        return
    until = _time.monotonic() + duration
    lobby.potion_puddles.append((x, z, radius, until, factor))


# Helpers ---------------------------------------------------------------------

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


# Public entry point ----------------------------------------------------------

async def apply_ability_events(
    lobby: Lobby, events: list[AbilityEvent], rng: random.Random,
) -> None:
    """Resolve each event into server-state changes + a broadcast packet."""
    now = _time.monotonic()
    teacher_by_id: dict[str, TeacherState] = {t.id: t for t in lobby.teachers}

    for ev in events:
        pkt: dict = {
            "type": "teacher_ability",
            "id": ev.teacher_id,
            "ability": ev.ability,
            "x": ev.x,
            "z": ev.z,
        }
        if ev.target_id:
            pkt["targetId"] = ev.target_id

        if ev.ability == "potion_throw" and ev.target_id:
            tgt = _find_player(lobby, ev.target_id)
            if tgt is None:
                continue
            travel = POTION_TRAVEL_MS / 1000.0
            asyncio.create_task(_delayed_puddle(
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
            asyncio.create_task(_delayed_stun(lobby, tgt.id, STUN_DURATION, travel))
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
                asyncio.create_task(_delayed_stun(lobby, tgt.id, stun_s, travel))
            if slow_s > 0:
                asyncio.create_task(_delayed_slow(lobby, tgt.id, slow_f, slow_s, travel))
            pkt["payload"] = {
                "targetX": tgt.x, "targetZ": tgt.z,
                "travelMs": travel_ms,
            }

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
