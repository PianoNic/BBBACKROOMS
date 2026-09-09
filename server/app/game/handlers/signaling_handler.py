"""WebRTC signaling relay.

Server is a dumb pipe: it forwards SDP / ICE blobs between two specific peers
in the same lobby without inspecting them. The webcam mesh itself lives in
the browser; this module's only job is delivery.
"""
from __future__ import annotations

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn
from app.game.broadcaster import Broadcaster


class SignalingHandler:
    def __init__(self, broadcaster: Broadcaster) -> None:
        self._broadcaster = broadcaster

    async def relay_signal(
        self, lobby: Lobby, sender: PlayerConn, to: str, kind: str, data: dict,
    ) -> None:
        target = lobby.conns.get(to)
        if target is None or target.id == sender.id:
            return
        try:
            await target.channel.send_json({
                "type": "webrtc_signal",
                "from": sender.id, "kind": kind, "data": data,
            })
        except Exception:
            pass

    async def broadcast_webcam_state(
        self, lobby: Lobby, sender: PlayerConn, on: bool,
    ) -> None:
        await self._broadcaster.broadcast(
            lobby, {"type": "webcam_state", "id": sender.id, "on": on},
            exclude=sender.id,
        )
