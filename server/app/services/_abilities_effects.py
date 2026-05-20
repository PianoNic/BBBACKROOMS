"""Delayed-effect coroutines + per-throw tuning for teacher abilities.
Kept separate from `abilities.py` so the main dispatch stays compact."""
from __future__ import annotations

import asyncio
import time as _time

from app.domain.lobby import Lobby

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
    # Themed throws used by trade-subject teachers (Coiffeur / Köch / Auto …).
    "scissor_throw":    (400, 0.7, 0.0, 1.0),   # snip — quick stun
    "plate_smash":      (550, 1.0, 0.0, 1.0),   # smash — clean stun
    "wrench_throw":     (800, 1.2, 1.5, 0.7),   # heavy — stun + slow
}

# Soup / oil puddles share the potion mechanic with different tuning.
SOUP_RADIUS = 1.8
SOUP_DURATION = 4.0
SOUP_SLOW_FACTOR = 0.55
SOUP_TRAVEL_MS = 650

OIL_RADIUS = 2.4
OIL_DURATION = 8.0
OIL_SLOW_FACTOR = 0.45
OIL_TRAVEL_MS = 600

# Per-puddle tuning so abilities.py can dispatch by id without a big switch.
PUDDLES: dict[str, tuple[float, float, float, int]] = {
    # ability: (radius, duration_s, slow_factor, travelMs)
    "soup_splash": (SOUP_RADIUS, SOUP_DURATION, SOUP_SLOW_FACTOR, SOUP_TRAVEL_MS),
    "oil_slick":   (OIL_RADIUS,  OIL_DURATION,  OIL_SLOW_FACTOR,  OIL_TRAVEL_MS),
}

# Instant on-hit effects (no projectile, fires immediately on the target).
CIRCUIT_STUN_DURATION = 1.4


async def delayed_stun(
    lobby: Lobby, player_id: str, duration: float, delay: float,
) -> None:
    await asyncio.sleep(delay)
    p = lobby.conns.get(player_id)
    if p is None or p.id in lobby.dead or p.id in lobby.extracted:
        return
    p.stun_until = _time.monotonic() + duration


async def delayed_slow(
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


async def delayed_puddle(
    lobby: Lobby, x: float, z: float, radius: float,
    duration: float, factor: float, delay: float,
) -> None:
    await asyncio.sleep(delay)
    if lobby.status != "running":
        return
    until = _time.monotonic() + duration
    lobby.potion_puddles.append((x, z, radius, until, factor))
