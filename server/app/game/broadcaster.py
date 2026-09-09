from __future__ import annotations

import asyncio
import json

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn


class Broadcaster:
    async def _send_text(self, channel, payload: str) -> None:
        try:
            await channel.send_text(payload)
        except Exception:
            pass  # client probably gone — the WS handler will clean up

    async def broadcast(self, lobby: Lobby, packet: dict, exclude: str | None = None) -> None:
        """Serialise `pkt` once and push the bytes to every connection at once.

        `ws.send_json` would re-run `json.dumps` per recipient, so a 100-player
        lobby paid 100 encodes for one logical broadcast; awaiting the sends in a
        loop also made each client wait on the previous client's flush.
        """
        targets = [
            p.channel for p in lobby.conns.values() if p.id != exclude and p.ready
        ]
        if not targets:
            return
        payload = json.dumps(packet, separators=(",", ":"))
        await asyncio.gather(*(self._send_text(channel, payload) for channel in targets))

    async def send_safe(self, player: PlayerConn, packet: dict) -> None:
        """Send a packet to one player, silently dropping connection errors.
        The WS handler will clean up disconnected sockets on its own."""
        try:
            await player.channel.send_json(packet)
        except Exception:
            pass

    def is_active(self, lobby: Lobby, player: PlayerConn) -> bool:
        """True iff this player can act — not dead, not already extracted."""
        return player.id not in lobby.dead and player.id not in lobby.extracted


broadcaster = Broadcaster()
