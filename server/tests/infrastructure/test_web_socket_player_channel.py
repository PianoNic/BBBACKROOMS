from __future__ import annotations

from app.infrastructure.realtime.web_socket_player_channel import WebSocketPlayerChannel


class _RecordingSocket:
    def __init__(self) -> None:
        self.json_sent: list[dict] = []
        self.text_sent: list[str] = []

    async def send_json(self, payload: dict) -> None:
        self.json_sent.append(payload)

    async def send_text(self, payload: str) -> None:
        self.text_sent.append(payload)


async def test_send_json_forwards_to_the_wrapped_socket():
    socket = _RecordingSocket()
    channel = WebSocketPlayerChannel(socket)

    await channel.send_json({"type": "ping"})

    assert socket.json_sent == [{"type": "ping"}]


async def test_send_text_forwards_to_the_wrapped_socket():
    socket = _RecordingSocket()
    channel = WebSocketPlayerChannel(socket)

    await channel.send_text("raw-payload")

    assert socket.text_sent == ["raw-payload"]
