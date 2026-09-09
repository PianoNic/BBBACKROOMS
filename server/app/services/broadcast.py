from __future__ import annotations

from app.domain.lobbies.lobby import Lobby
from app.game.broadcaster import broadcaster


async def broadcast(lobby: Lobby, pkt: dict, exclude: str | None = None) -> None:
    await broadcaster.broadcast(lobby, pkt, exclude=exclude)
