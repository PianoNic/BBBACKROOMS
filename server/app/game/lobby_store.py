from __future__ import annotations

from app.domain.lobby import Lobby
from app.game.lobby_registry import lobby_registry


def create_lobby(
    name: str, *, max_players: int = 8, password: str | None = None,
) -> Lobby:
    return lobby_registry.create(name, max_players=max_players, password=password)


def get_lobby(lid: str) -> Lobby | None:
    return lobby_registry.get(lid)


def list_lobbies() -> list[Lobby]:
    return lobby_registry.list()


def delete_lobby(lid: str) -> None:
    lobby_registry.delete(lid)
