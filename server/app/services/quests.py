"""Objective progress: completing find/interact spots, gating extraction."""
from __future__ import annotations

import time as _time

from app.domain.lobby import Lobby, PlayerConn
from app.services.broadcast import broadcast
from app.world.geom import within_radius


async def try_complete_spots(
    lobby: Lobby, p: PlayerConn, *, require_interact: bool,
) -> None:
    """Check every active objective spot against the player's current pose
    and mark anything they're standing in. Broadcasts progress packets."""
    assert lobby.world is not None
    for obj in lobby.world.objectives:
        if obj.done or obj.interact != require_interact or obj.kind == "casino":
            continue
        changed = False
        for idx, s in enumerate(obj.spots):
            if s.done:
                continue
            if within_radius(p, s, obj.radius):
                s.done = True
                changed = True
                p.tasks_done += 1
                await broadcast(lobby, {
                    "type": "spot_done", "id": obj.id, "spot": idx, "by": p.id,
                })
        if changed and all(s.done for s in obj.spots):
            obj.done = True
            await broadcast(lobby, {"type": "objective_done", "id": obj.id, "by": p.id})
    if all(o.done for o in lobby.world.objectives):
        lobby.phase = "escape"
        await broadcast(lobby, {"type": "phase_change", "phase": "escape"})


async def check_extraction(lobby: Lobby, p: PlayerConn) -> None:
    """When in escape phase and standing in the vent zone, extract the player."""
    if lobby.phase != "escape" or p.id in lobby.extracted:
        return
    if _time.monotonic() < lobby.extraction_locked_until:
        return  # vent_lockout active
    assert lobby.world is not None
    ex = lobby.world.extraction
    if within_radius(p, ex, ex.radius):
        from app.services.chairs import release_chairs_held_by
        lobby.extracted.add(p.id)
        p.extracted_t = _time.monotonic()
        await release_chairs_held_by(lobby, p.id)
        await broadcast(lobby, {"type": "player_extracted", "id": p.id})
        if lobby.conns and all(
            pid in lobby.extracted or pid in lobby.dead for pid in lobby.conns
        ):
            from app.services.endgame import broadcast_endgame
            lobby.phase = "won"
            await broadcast_endgame(lobby, "won")
