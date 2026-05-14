"""WebRTC signaling relay.

Server is a dumb pipe: it forwards SDP / ICE blobs between two specific peers
in the same lobby without inspecting them. The webcam mesh itself lives in
the browser; this module's only job is delivery.
"""
from __future__ import annotations

from app.domain.lobby import Lobby, PlayerConn
from app.services.broadcast import broadcast


async def relay_signal(
    lobby: Lobby, sender: PlayerConn, to: str, kind: str, data: dict,
) -> None:
    target = lobby.conns.get(to)
    if target is None or target.id == sender.id:
        return
    try:
        await target.ws.send_json({
            "type": "webrtc_signal",
            "from": sender.id, "kind": kind, "data": data,
        })
    except Exception:
        pass


async def broadcast_webcam_state(
    lobby: Lobby, sender: PlayerConn, on: bool,
) -> None:
    await broadcast(
        lobby, {"type": "webcam_state", "id": sender.id, "on": on},
        exclude=sender.id,
    )
