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
}


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
