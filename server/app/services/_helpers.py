from __future__ import annotations

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn
from app.game.broadcaster import broadcaster


def is_active(lobby: Lobby, p: PlayerConn) -> bool:
    return broadcaster.is_active(lobby, p)


async def send_safe(p: PlayerConn, pkt: dict) -> None:
    await broadcaster.send_safe(p, pkt)
