"""Tiny helper around fan-out sends to every connected player in a lobby."""
from __future__ import annotations

from app.domain.lobby import Lobby


async def broadcast(lobby: Lobby, pkt: dict, exclude: str | None = None) -> None:
    for p in list(lobby.conns.values()):
        if p.id == exclude:
            continue
        try:
            await p.ws.send_json(pkt)
        except Exception:
            pass  # client probably gone — the WS handler will clean up
