from __future__ import annotations

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn
from app.domain.progression.scoreboard_builder import ScoreboardBuilder


class WorldInitBuilder:
    def __init__(self, scoreboard_builder: ScoreboardBuilder) -> None:
        self._scoreboard_builder = scoreboard_builder

    def _laptop_done_status(self, lobby: Lobby, laptop_id: str) -> bool:
        assert lobby.world is not None
        for obj in lobby.world.objectives:
            if obj.kind != "casino":
                continue
            for s in obj.spots:
                if s.tag == laptop_id:
                    return s.done
        return False

    def build(self, lobby: Lobby, me: PlayerConn) -> dict:
        """Per-player WORLD_INIT snapshot sent on game start."""
        assert lobby.world is not None
        init_payload = lobby.world.model_dump()
        init_payload["selfId"] = me.id
        init_payload["selfColor"] = me.color
        init_payload["players"] = [
            {
                "id": p.id, "color": p.color, "x": p.x, "z": p.z, "yaw": p.yaw,
                "avatar": p.avatar, "equipped": p.equipped_cosmetics,
            }
            for p in lobby.conns.values() if p.id != me.id
        ]
        init_payload["selfCosmetics"] = {
            "owned": sorted(me.owned_cosmetics),
            "equipped": me.equipped_cosmetics,
        }
        init_payload["phase"] = lobby.phase
        init_payload["extractedPlayers"] = list(lobby.extracted)
        init_payload["deadPlayers"] = list(lobby.dead)
        init_payload["laptops"] = [
            {
                "id": lp.id, "x": lp.x, "z": lp.z, "yaw": lp.yaw,
                "game": lp.game, "done": self._laptop_done_status(lobby, lp.id),
            }
            for lp in lobby.laptops.values()
        ]
        init_payload["props"] = [
            p for p in init_payload["props"]
            if p["type"] not in ("laptop", "chair", "locker")
        ]
        init_payload["lockers"] = [
            {"id": lk.id, "x": lk.x, "z": lk.z, "yaw": lk.yaw,
             "opened": lk.opened, "has_item": False}
            for lk in lobby.lockers.values()
        ]
        init_payload["chairs"] = [
            {
                "id": c.id, "x": c.x, "z": c.z, "yaw": c.yaw,
                "heldBy": c.held_by,
            }
            for c in lobby.chairs.values()
        ]
        init_payload["pickups"] = [
            {"id": pk.id, "kind": pk.kind, "x": pk.x, "z": pk.z}
            for pk in lobby.pickups.values()
        ]
        init_payload["corpses"] = [
            {"id": pid, "x": x, "z": z} for pid, (x, z) in lobby.corpses.items()
        ]
        init_payload["doors"] = [
            {"id": d.id, "x": d.x, "z": d.z, "yaw": d.yaw_closed, "isOpen": d.is_open}
            for d in lobby.doors_state.values()
        ]
        init_payload["inventory"] = {
            "medkits": me.medkits, "potions": me.potions,
            "compasses": me.compasses, "trackers": me.trackers,
            "goggles": me.goggles, "gps": me.gps,
        }
        # Reconnecting into an already-decided round: ship the scoreboard (with
        # this player's own rewards block) so the client renders the end screen.
        if lobby.phase in ("won", "lost"):
            init_payload["scoreboard"] = {
                **self._scoreboard_builder.build(lobby, lobby.phase),
                "selfRewards": lobby.round_rewards.get(me.id),
            }
        else:
            init_payload["scoreboard"] = None
        return init_payload
