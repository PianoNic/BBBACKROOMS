from __future__ import annotations

from fastapi import WebSocket

from app.domain.lobbies.player_channel import IPlayerChannel


class WebSocketPlayerChannel(IPlayerChannel):
    def __init__(self, websocket: WebSocket) -> None:
        self._websocket = websocket

    async def send_json(self, payload: dict) -> None:
        await self._websocket.send_json(payload)

    async def send_text(self, payload: str) -> None:
        await self._websocket.send_text(payload)
