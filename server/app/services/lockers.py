"""Locker open + item-reveal logic.

A player presses E on a closed locker → server marks it opened and the
item inside (if any) is dropped at the locker as a regular `Pickup`. The
player then has to interact AGAIN to actually claim it — no more silent
auto-collect that the user can't see happen."""
from __future__ import annotations

import secrets

from app.domain.lobby import Lobby, Pickup, PlayerConn
from app.services._helpers import is_active
from app.services.broadcast import broadcast
from app.services.noise import LOCKER_RADIUS, emit_noise
from app.world.geom import wall_forward, within_radius_xz

LOCKER_OPEN_RADIUS = 3.5
# Distance from the locker's wall-mount position to the centre of its
# interior cavity. The locker mesh is D=0.4m deep; half that puts the
# pickup right in the middle of the open door, where it's visible.
LOCKER_CAVITY_OFFSET = 0.20


async def handle_open(lobby: Lobby, me: PlayerConn, locker_id: str) -> None:
    if not is_active(lobby, me):
        return
    lk = lobby.lockers.get(locker_id)
    if lk is None or lk.opened:
        return
    if not within_radius_xz(me.x, me.z, lk.x, lk.z, LOCKER_OPEN_RADIUS):
        return
    lk.opened = True
    emit_noise(lobby, lk.x, lk.z, LOCKER_RADIUS)
    spawned: Pickup | None = None
    if lk.item is not None:
        # Drop the item as a visible pickup inside the locker. The
        # player claims it with a second interact press. Offset along
        # the locker's open direction (local -Z) so the item sits in
        # the cavity, not embedded in the wall behind it.
        dx, dz = wall_forward(lk.yaw, LOCKER_CAVITY_OFFSET)
        px = lk.x + dx
        pz = lk.z + dz
        spawned = Pickup(id=secrets.token_hex(3), kind=lk.item, x=px, z=pz)
        lobby.pickups[spawned.id] = spawned
        lk.item = None
    await broadcast(lobby, {
        "type": "locker_opened",
        "id": lk.id,
        "by": me.id,
        "autoCollected": None,
        "spawned": (
            {"id": spawned.id, "kind": spawned.kind, "x": spawned.x, "z": spawned.z}
            if spawned else None
        ),
    })
