"""Classroom door open/close logic.

Doors are visual + atmospheric: they do not block movement or sight. A
player presses E on a door within `DOOR_REACH` → server flips the
is_open flag and broadcasts the new state. The teacher AI loop calls
`maybe_teacher_toggle` to let teachers organically open/close doors as
they patrol."""
from __future__ import annotations

import random
import time as _time

from app.domain.lobby import Lobby, PlayerConn
from app.services._helpers import is_active
from app.services.broadcast import broadcast
from app.world.geom import within_radius_xz

DOOR_REACH = 3.5
TEACHER_TOGGLE_RADIUS = 1.0
TEACHER_TOGGLE_COOLDOWN_S = 4.0
# Per-tick chance a teacher inside the radius toggles a door. Kept low so
# doors don't flap constantly — feels like a teacher walked past, not a
# poltergeist.
TEACHER_OPEN_CHANCE = 0.35
TEACHER_CLOSE_CHANCE = 0.05


async def handle_door_toggle(lobby: Lobby, me: PlayerConn, door_id: str) -> None:
    if not is_active(lobby, me):
        return
    d = lobby.doors_state.get(door_id)
    if d is None:
        return
    if not within_radius_xz(me.x, me.z, d.x, d.z, DOOR_REACH):
        return
    d.is_open = not d.is_open
    await broadcast(lobby, {
        "type": "door_state", "id": d.id, "isOpen": d.is_open, "by": me.id,
    })


async def maybe_teacher_toggle(lobby: Lobby, rng: random.Random) -> None:
    if not lobby.doors_state or not lobby.teachers:
        return
    now = _time.monotonic()
    for d in lobby.doors_state.values():
        if d.teacher_cooldown_until > now:
            continue
        near = False
        for t in lobby.teachers:
            dx = t.x - d.x
            dz = t.z - d.z
            if dx * dx + dz * dz <= TEACHER_TOGGLE_RADIUS * TEACHER_TOGGLE_RADIUS:
                near = True
                break
        if not near:
            continue
        chance = TEACHER_CLOSE_CHANCE if d.is_open else TEACHER_OPEN_CHANCE
        if rng.random() >= chance:
            continue
        d.is_open = not d.is_open
        d.teacher_cooldown_until = now + TEACHER_TOGGLE_COOLDOWN_S
        await broadcast(lobby, {
            "type": "door_state", "id": d.id, "isOpen": d.is_open, "by": None,
        })
