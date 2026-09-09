from __future__ import annotations

from app.domain.lobbies.lobby import Lobby
from app.domain.world.teachers import roster_dto


class LobbyStateBuilder:
    def build(self, lobby: Lobby, self_id: str) -> dict:
        """Snapshot of a lobby's waiting room for a freshly connected player."""
        me = lobby.conns.get(self_id)
        return {
            "type": "lobby_state",
            "id": lobby.id,
            "name": lobby.name,
            "status": lobby.status,
            "maxPlayers": lobby.max_players,
            "hasPassword": lobby.password is not None,
            "adminId": lobby.admin_id,
            "selfId": self_id,
            "selectedTeachers": lobby.selected_teacher_images,
            "mapSize": lobby.map_size,
            "mapSeed": lobby.map_seed,
            "objectiveCount": lobby.objective_count,
            "packId": lobby.pack_id,
            "packHash": lobby.pack_hash,
            "roster": roster_dto(),
            "players": [
                {
                    "id": p.id, "name": p.name, "color": p.color, "avatar": p.avatar,
                    "equipped": p.equipped_cosmetics,
                }
                for p in lobby.conns.values()
            ],
            "selfCosmetics": {
                "owned": sorted(me.owned_cosmetics) if me else [],
                "equipped": me.equipped_cosmetics if me else {},
            },
            "chat": [
                {"id": m.id, "author": m.author, "text": m.text, "ts": m.ts}
                for m in lobby.chat
            ],
        }
