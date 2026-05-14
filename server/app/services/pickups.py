"""Pickup collection + inventory-item activations (potion, goggles).

Clients send "intent" packets; this module validates state, mutates the
inventory, and broadcasts the resulting events. Revive flow lives in
`revive.py` to keep concerns separate."""
from __future__ import annotations

import time as _time

from app.domain.lobby import Lobby, PlayerConn
from app.services.broadcast import broadcast
from app.world.geom import within_radius

PICKUP_RADIUS = 3.0
POTION_DURATION = 8.0
POTION_FACTOR = 1.5  # speed multiplier while haste active

# Per-player carry caps. Walking over a pickup while already at the cap is a
# no-op: the world item stays where it is so a teammate who needs it can grab
# it. Compass/tracker have no real cap — first one unlocks the HUD, more
# don't matter.
INVENTORY_CAPS = {
    "medkit": 2, "potion": 3,
    "compass": 99, "tracker": 99, "goggles": 1, "gps": 1,
}


# Pickup kind → name of the PlayerConn counter to bump on collect.
PICKUP_ATTR = {
    "medkit": "medkits", "potion": "potions",
    "compass": "compasses", "tracker": "trackers",
    "goggles": "goggles", "gps": "gps",
}

# Thermal goggles tuning.
GOGGLES_DURATION = 3.0
GOGGLES_COOLDOWN = 30.0


async def send_inventory(p: PlayerConn) -> None:
    try:
        await p.ws.send_json({
            "type": "inventory",
            "medkits": p.medkits,
            "potions": p.potions,
            "compasses": p.compasses,
            "trackers": p.trackers,
            "goggles": p.goggles,
            "gps": p.gps,
        })
    except Exception:
        pass


async def handle_collect(lobby: Lobby, me: PlayerConn, pickup_id: str) -> None:
    if me.id in lobby.dead or me.id in lobby.extracted:
        return
    pk = lobby.pickups.get(pickup_id)
    if pk is None:
        return
    attr = PICKUP_ATTR.get(pk.kind)
    if attr is None:
        return
    if not within_radius(me, pk, PICKUP_RADIUS):
        return
    cap = INVENTORY_CAPS.get(pk.kind, 99)
    if getattr(me, attr) >= cap:
        # Already at the cap — leave the pickup in the world for someone else.
        return
    setattr(me, attr, getattr(me, attr) + 1)
    lobby.pickups.pop(pickup_id, None)
    await broadcast(lobby, {"type": "pickup_taken", "id": pickup_id, "by": me.id})
    await send_inventory(me)


async def handle_use_potion(lobby: Lobby, me: PlayerConn) -> None:
    if me.id in lobby.dead or me.id in lobby.extracted:
        return
    if me.potions <= 0:
        return
    me.potions -= 1
    now = _time.monotonic()
    me.haste_until = max(me.haste_until, now + POTION_DURATION)
    me.haste_factor = POTION_FACTOR
    await send_inventory(me)
    # Speed buff is broadcast via the next push_player_status tick — no
    # separate packet needed.


async def handle_use_goggles(lobby: Lobby, me: PlayerConn) -> None:
    """Activate the thermal goggles for GOGGLES_DURATION seconds. Subject to
    a per-player cooldown so they can only be used once per ~30s. The item
    itself is not consumed — owning the goggles grants the ability."""
    if me.id in lobby.dead or me.id in lobby.extracted:
        return
    if me.goggles <= 0:
        return
    now = _time.monotonic()
    if now < me.goggles_cooldown_until:
        return
    me.goggles_until = now + GOGGLES_DURATION
    me.goggles_cooldown_until = now + GOGGLES_COOLDOWN
    try:
        await me.ws.send_json({
            "type": "goggles_state",
            "activeMs": int(GOGGLES_DURATION * 1000),
            "cooldownMs": int(GOGGLES_COOLDOWN * 1000),
        })
    except Exception:
        pass
