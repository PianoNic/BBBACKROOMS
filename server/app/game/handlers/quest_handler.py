"""Objective progress: completing find/interact spots, gating extraction."""
from __future__ import annotations

import time as _time

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn
from app.game.broadcaster import Broadcaster
from app.game.handlers.chair_handler import ChairHandler
from app.domain.world.geom import within_radius


class QuestHandler:
    def __init__(self, broadcaster: Broadcaster, chair_handler: ChairHandler) -> None:
        self._broadcaster = broadcaster
        self._chair_handler = chair_handler

    async def try_complete_spots(
        self, lobby: Lobby, p: PlayerConn, *, require_interact: bool,
    ) -> None:
        """Check every active objective spot against the player's current pose
        and mark anything they're standing in. Broadcasts progress packets."""
        assert lobby.world is not None
        for obj in lobby.world.objectives:
            if obj.done or obj.interact != require_interact or obj.kind == "casino":
                continue
            # Co-op objectives need `min_players` living players inside the
            # radius at once. Clamped to the current active player count so a
            # shrinking lobby can never soft-lock the run.
            required = obj.min_players
            active: list[PlayerConn] = []
            if required > 1:
                active = [
                    q for pid, q in lobby.conns.items()
                    if pid not in lobby.dead and pid not in lobby.extracted
                ]
                required = max(1, min(required, len(active)))
            changed = False
            for idx, s in enumerate(obj.spots):
                if s.done:
                    continue
                if not within_radius(p, s, obj.radius):
                    continue
                if required > 1:
                    near = sum(1 for q in active if within_radius(q, s, obj.radius))
                    if near < required:
                        continue
                s.done = True
                changed = True
                p.tasks_done += 1
                await self._broadcaster.broadcast(lobby, {
                    "type": "spot_done", "id": obj.id, "spot": idx, "by": p.id,
                })
            if changed and all(s.done for s in obj.spots):
                obj.done = True
                await self._broadcaster.broadcast(lobby, {"type": "objective_done", "id": obj.id, "by": p.id})
        if all(o.done for o in lobby.world.objectives):
            lobby.phase = "escape"
            await self._broadcaster.broadcast(lobby, {"type": "phase_change", "phase": "escape"})

    async def check_extraction(self, lobby: Lobby, p: PlayerConn) -> None:
        """When in escape phase and standing in the vent zone, extract the player."""
        if lobby.phase != "escape" or p.id in lobby.extracted:
            return
        if _time.monotonic() < lobby.extraction_locked_until:
            return  # vent_lockout active
        assert lobby.world is not None
        ex = lobby.world.extraction
        if within_radius(p, ex, ex.radius):
            lobby.extracted.add(p.id)
            p.extracted_t = _time.monotonic()
            await self._chair_handler.release_chairs_held_by(lobby, p.id)
            await self._broadcaster.broadcast(lobby, {"type": "player_extracted", "id": p.id})
            if lobby.conns and all(
                pid in lobby.extracted or pid in lobby.dead for pid in lobby.conns
            ):
                from app.services.endgame import broadcast_endgame
                lobby.phase = "won"
                await broadcast_endgame(lobby, "won")
