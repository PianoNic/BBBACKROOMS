"""Noise events that attract teachers.

Loud actions (sprinting, voice chat, chair throws, lockers, doors) emit a
positioned noise with a hearing radius. Each teacher tick drains the event
queue and sends every non-stunned teacher inside a radius to investigate
the spot for a few seconds — unless they're already chasing a player
(chase always wins in `teacher_ai._pick_target`).

Sprinting is inferred server-side from move-packet speed so clients can't
opt out; voice is reported by the client (mic level), but the position and
rate limit are always server-side.
"""
from __future__ import annotations

import math
import time as _time

from app.domain.lobby import Lobby, PlayerConn

# Speed gate: walking is 5.0 m/s, sprinting 8.5 m/s client-side. Anything
# implausibly fast (teleports: spawn, revive) is ignored.
SPRINT_SPEED_THRESHOLD = 6.5
TELEPORT_SPEED = 14.0

SPRINT_RADIUS = 13.0
SPRINT_EMIT_INTERVAL_S = 0.6
VOICE_RADIUS = 12.0
VOICE_EMIT_INTERVAL_S = 1.0
CHAIR_THROW_RADIUS = 20.0
LOCKER_RADIUS = 10.0
DOOR_RADIUS = 8.0

INVESTIGATE_S = 10.0


def _is_active(lobby: Lobby, p: PlayerConn) -> bool:
    return p.id not in lobby.dead and p.id not in lobby.extracted


def emit_noise(lobby: Lobby, x: float, z: float, radius: float) -> None:
    lobby.noise_events.append((x, z, radius))


def track_movement_noise(lobby: Lobby, me: PlayerConn) -> None:
    """Called per move packet: infer sprinting from displacement speed."""
    now = _time.monotonic()
    dt = now - me.last_move_t
    if me.last_move_t > 0.0 and 0.0 < dt < 1.0:
        speed = math.hypot(me.x - me.last_move_x, me.z - me.last_move_z) / dt
        if (
            SPRINT_SPEED_THRESHOLD < speed < TELEPORT_SPEED
            and now - me.last_noise_t >= SPRINT_EMIT_INTERVAL_S
            and _is_active(lobby, me)
        ):
            me.last_noise_t = now
            emit_noise(lobby, me.x, me.z, SPRINT_RADIUS)
    me.last_move_x, me.last_move_z, me.last_move_t = me.x, me.z, now


def handle_voice_noise(lobby: Lobby, me: PlayerConn) -> None:
    """Client reports the mic picked up speech; position is server truth."""
    now = _time.monotonic()
    if now - me.last_voice_noise_t < VOICE_EMIT_INTERVAL_S:
        return
    if not _is_active(lobby, me):
        return
    me.last_voice_noise_t = now
    emit_noise(lobby, me.x, me.z, VOICE_RADIUS)


def assign_noise_to_teachers(lobby: Lobby, now: float) -> None:
    """Drain queued noises; teachers in range investigate the newest one."""
    if not lobby.noise_events:
        return
    events = lobby.noise_events
    lobby.noise_events = []
    for t in lobby.teachers:
        if t.stun_until > now:
            continue
        for x, z, radius in events:
            dx, dz = t.x - x, t.z - z
            if dx * dx + dz * dz <= radius * radius:
                t.noise_x, t.noise_z = x, z
                t.noise_until = now + INVESTIGATE_S
