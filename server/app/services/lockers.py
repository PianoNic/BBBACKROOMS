"""Locker open + item-reveal logic.

A player presses E on a closed locker → server marks it opened and resolves
the item inside (if any). Auto-collect if the player has inventory room;
otherwise the item materialises as a regular `Pickup` at the locker's spot
so another player (or the same one once a slot frees up) can grab it later."""
from __future__ import annotations

import secrets

from app.domain.lobby import Lobby, Pickup, PlayerConn
from app.services.broadcast import broadcast
from app.services.pickups import INVENTORY_CAPS, PICKUP_ATTR, send_inventory
from app.world.geom import within_radius_xz

LOCKER_OPEN_RADIUS = 1.8


async def handle_open(lobby: Lobby, me: PlayerConn, locker_id: str) -> None:
    if me.id in lobby.dead or me.id in lobby.extracted:
        return
    lk = lobby.lockers.get(locker_id)
    if lk is None or lk.opened:
        return
    if not within_radius_xz(me.x, me.z, lk.x, lk.z, LOCKER_OPEN_RADIUS):
        return
    lk.opened = True
    auto_kind: str | None = None
    spawned: Pickup | None = None
    if lk.item is not None:
        attr = PICKUP_ATTR.get(lk.item)
        cap = INVENTORY_CAPS.get(lk.item, 99)
        if attr is not None and getattr(me, attr) < cap:
            setattr(me, attr, getattr(me, attr) + 1)
            auto_kind = lk.item
        else:
            spawned = Pickup(id=secrets.token_hex(3), kind=lk.item, x=lk.x, z=lk.z)
            lobby.pickups[spawned.id] = spawned
        lk.item = None
    await broadcast(lobby, {
        "type": "locker_opened",
        "id": lk.id,
        "by": me.id,
        "autoCollected": auto_kind,
        "spawned": (
            {"id": spawned.id, "kind": spawned.kind, "x": spawned.x, "z": spawned.z}
            if spawned else None
        ),
    })
    if auto_kind is not None:
        await send_inventory(me)
