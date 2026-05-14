"""In-memory lobby store. The only stateful piece of the domain layer.

The store owns lobby lifecycle (create, lookup, list, delete). World
generation and game start live in the service layer."""
from __future__ import annotations

import secrets

from app.domain.lobby import Lobby


_lobbies: dict[str, Lobby] = {}


def create_lobby(
    name: str, *, max_players: int = 8, password: str | None = None,
) -> Lobby:
    lid = secrets.token_hex(3)
    capped = max(1, min(100, int(max_players or 8)))
    pwd = password.strip() if isinstance(password, str) and password.strip() else None
    lobby = Lobby(id=lid, name=name or f"lobby-{lid}", max_players=capped, password=pwd)
    _lobbies[lid] = lobby
    return lobby


def get_lobby(lid: str) -> Lobby | None:
    return _lobbies.get(lid)


def list_lobbies() -> list[Lobby]:
    return list(_lobbies.values())


def delete_lobby(lid: str) -> None:
    _lobbies.pop(lid, None)
