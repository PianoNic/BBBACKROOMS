"""Tiny helper around fan-out sends to every connected player in a lobby."""
from __future__ import annotations

import asyncio
import json

from app.domain.lobby import Lobby


async def _send_text(ws, payload: str) -> None:
    try:
        await ws.send_text(payload)
    except Exception:
        pass  # client probably gone — the WS handler will clean up


async def broadcast(lobby: Lobby, pkt: dict, exclude: str | None = None) -> None:
    """Serialise `pkt` once and push the bytes to every connection at once.

    `ws.send_json` would re-run `json.dumps` per recipient, so a 100-player
    lobby paid 100 encodes for one logical broadcast; awaiting the sends in a
    loop also made each client wait on the previous client's flush.
    """
    targets = [
        p.ws for p in lobby.conns.values() if p.id != exclude and p.ready
    ]
    if not targets:
        return
    payload = json.dumps(pkt, separators=(",", ":"))
    await asyncio.gather(*(_send_text(ws, payload) for ws in targets))
