from __future__ import annotations

import secrets

from app.domain.lobbies.lobby_registry import ILobbyRegistry
from app.domain.lobby import Lobby


class InMemoryLobbyRegistry(ILobbyRegistry):
    def __init__(self) -> None:
        self._lobbies: dict[str, Lobby] = {}

    def create(self, name: str, *, max_players: int = 8, password: str | None = None) -> Lobby:
        lid = secrets.token_hex(3)
        capped = max(1, min(100, int(max_players or 8)))
        pwd = password.strip() if isinstance(password, str) and password.strip() else None
        lobby = Lobby(id=lid, name=name or f"lobby-{lid}", max_players=capped, password=pwd)
        self._lobbies[lid] = lobby
        return lobby

    def get(self, lobby_id: str) -> Lobby | None:
        return self._lobbies.get(lobby_id)

    def list(self) -> list[Lobby]:
        return list(self._lobbies.values())

    def delete(self, lobby_id: str) -> None:
        self._lobbies.pop(lobby_id, None)


lobby_registry = InMemoryLobbyRegistry()
