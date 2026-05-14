"""Shared interaction-handler helpers.

Almost every player-action service starts with the same two checks (the
player is alive + still in the run) and ends with a single-player WS send
that has to swallow connection errors. Centralising both keeps individual
handlers focused on their actual logic."""
from __future__ import annotations

from app.domain.lobby import Lobby, PlayerConn


def is_active(lobby: Lobby, p: PlayerConn) -> bool:
    """True iff this player can act — not dead, not already extracted."""
    return p.id not in lobby.dead and p.id not in lobby.extracted


async def send_safe(p: PlayerConn, pkt: dict) -> None:
    """Send a packet to one player, silently dropping connection errors.
    The WS handler will clean up disconnected sockets on its own."""
    try:
        await p.ws.send_json(pkt)
    except Exception:
        pass
