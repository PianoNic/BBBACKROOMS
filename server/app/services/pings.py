"""Teammate pings: rebroadcast a marked world spot with the sender's colour.

Rate-limited per player so the marker (and its minimap pulse) can't be
spammed into noise. Dead and extracted players may still ping — spectators
calling out a teacher position for the living is a feature, not a bug.
"""
from __future__ import annotations

import time as _time

from app.domain.lobby import Lobby, PlayerConn
from app.services.broadcast import broadcast

PING_COOLDOWN_S = 1.5
# Keep pings inside the playable area even if a client sends junk.
MAX_COORD = 10_000.0


async def handle_ping(lobby: Lobby, me: PlayerConn, x: float, z: float) -> None:
    now = _time.monotonic()
    if now - me.last_ping_t < PING_COOLDOWN_S:
        return
    if not (-MAX_COORD <= x <= MAX_COORD and -MAX_COORD <= z <= MAX_COORD):
        return
    me.last_ping_t = now
    await broadcast(lobby, {
        "type": "player_ping", "id": me.id, "color": me.color, "x": x, "z": z,
    })
