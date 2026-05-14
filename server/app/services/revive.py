"""Revive channel logic.

Reviver presses E next to a corpse, server starts a timed `Revive` entry,
the teacher loop calls `tick_revives` every frame to check progress and
cancellation conditions. On success the target leaves `lobby.dead` and
re-spawns at the corpse location."""
from __future__ import annotations

import time as _time

from app.domain.lobby import Lobby, PlayerConn, Revive
from app.services.broadcast import broadcast
from app.world.geom import within_radius_xz

REVIVE_RADIUS = 4.0
REVIVE_MOVE_TOLERANCE = 1.4  # m — reviver must hold still
REVIVE_DURATION = 3.0


async def _push_progress(p: PlayerConn, progress: float) -> None:
    try:
        await p.ws.send_json({"type": "revive_progress", "progress": progress})
    except Exception:
        pass


async def handle_revive_start(lobby: Lobby, me: PlayerConn, target_id: str) -> None:
    if me.id in lobby.dead or me.id in lobby.extracted:
        return
    if me.medkits <= 0:
        return
    if target_id not in lobby.dead:
        return
    corpse = lobby.corpses.get(target_id)
    if corpse is None:
        return
    cx, cz = corpse
    if not within_radius_xz(me.x, me.z, cx, cz, REVIVE_RADIUS):
        return
    now = _time.monotonic()
    lobby.revives[me.id] = Revive(
        reviver_id=me.id, target_id=target_id,
        start_x=me.x, start_z=me.z,
        started_at=now, completes_at=now + REVIVE_DURATION,
    )
    await _push_progress(me, 0.0)


async def handle_revive_cancel(lobby: Lobby, me: PlayerConn) -> None:
    if me.id in lobby.revives:
        lobby.revives.pop(me.id, None)
        await _push_progress(me, -1.0)


async def cancel_revives_for(lobby: Lobby, player_id: str) -> None:
    """Drop any revive run by, or aimed at, this player. Called on death/leave."""
    drop: list[str] = []
    for rid, rv in lobby.revives.items():
        if rv.reviver_id == player_id or rv.target_id == player_id:
            drop.append(rid)
    for rid in drop:
        rv = lobby.revives.pop(rid, None)
        if rv is None:
            continue
        reviver = lobby.conns.get(rv.reviver_id)
        if reviver:
            await _push_progress(reviver, -1.0)


async def tick_revives(lobby: Lobby, now: float, on_complete) -> None:
    """Progress every in-flight revive. `on_complete(reviver)` is called
    after the inventory mutation so the caller can `send_inventory`."""
    if not lobby.revives:
        return
    done: list[Revive] = []
    cancel: list[str] = []
    for rid, rv in lobby.revives.items():
        reviver = lobby.conns.get(rv.reviver_id)
        target_alive_again = rv.target_id not in lobby.dead
        if reviver is None or reviver.id in lobby.dead or target_alive_again:
            cancel.append(rid)
            continue
        if not within_radius_xz(
            reviver.x, reviver.z, rv.start_x, rv.start_z, REVIVE_MOVE_TOLERANCE,
        ):
            cancel.append(rid)
            continue
        corpse = lobby.corpses.get(rv.target_id)
        if corpse is None:
            cancel.append(rid)
            continue
        cx, cz = corpse
        if not within_radius_xz(reviver.x, reviver.z, cx, cz, REVIVE_RADIUS):
            cancel.append(rid)
            continue
        elapsed = now - rv.started_at
        progress = min(1.0, elapsed / REVIVE_DURATION)
        await _push_progress(reviver, progress)
        if now >= rv.completes_at:
            done.append(rv)
    for rid in cancel:
        rv = lobby.revives.pop(rid, None)
        if rv:
            reviver = lobby.conns.get(rv.reviver_id)
            if reviver:
                await _push_progress(reviver, -1.0)
    for rv in done:
        lobby.revives.pop(rv.reviver_id, None)
        reviver = lobby.conns.get(rv.reviver_id)
        target = lobby.conns.get(rv.target_id)
        if reviver is None or target is None:
            continue
        if reviver.medkits <= 0:
            continue
        reviver.medkits -= 1
        lobby.dead.discard(target.id)
        corpse = lobby.corpses.pop(target.id, None)
        if corpse is not None:
            target.x, target.z = corpse
        await broadcast(lobby, {
            "type": "player_revived",
            "id": target.id, "by": reviver.id, "x": target.x, "z": target.z,
        })
        await on_complete(reviver)
