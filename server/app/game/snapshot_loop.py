"""Batched world-pose snapshots.

Movement used to be relayed per packet: every inbound `move` fanned out its
own `player_state` frame to every other player, so the cost grew with the
square of the lobby size (100 players x 15 Hz x 99 recipients ~= 148k frames
and just as many JSON encodes per second).

Instead each move only marks the player's pose dirty, and this loop pushes a
single `players_state` packet per tick carrying every player that actually
moved plus the current teacher positions. One encode, one frame per client.

It runs at its own `SNAPSHOT_HZ` rather than piggybacking on the 8 Hz teacher
tick so remote players keep the pose fidelity they had before (clients send at
`SEND_HZ = 15`), and teacher motion actually gets smoother.
"""
from __future__ import annotations

import asyncio

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.lobby_registry import ILobbyRegistry
from app.game.broadcaster import Broadcaster

SNAPSHOT_HZ = 15


class SnapshotLoop:
    def __init__(self, lobby_registry: ILobbyRegistry, broadcaster: Broadcaster) -> None:
        self._lobby_registry = lobby_registry
        self._broadcaster = broadcaster
        self._snapshot_tasks: dict[str, asyncio.Task] = {}

    def ensure(self, lobby: Lobby) -> None:
        if lobby.id in self._snapshot_tasks:
            return
        self._snapshot_tasks[lobby.id] = asyncio.create_task(self._snapshot_loop(lobby.id))

    def _round2(self, v: float) -> float:
        """Centimetre precision. Python renders floats at full repr — a raw
        `31.885000000000005` is 18 payload characters where `31.89` is 5."""
        return round(v, 2)

    async def _push_snapshot(self, lobby: Lobby) -> None:
        players = []
        for p in lobby.conns.values():
            if not p.pose_dirty:
                continue
            p.pose_dirty = False
            # Hidden players are pinned inside a closet and render nothing; their
            # pose is carried by the `player_hidden` packet instead.
            if p.hidden_in is not None:
                continue
            players.append({
                "id": p.id,
                "x": self._round2(p.x), "z": self._round2(p.z), "yaw": round(p.yaw, 3),
            })
        teachers = [
            {"id": t.id, "x": self._round2(t.x), "z": self._round2(t.z)}
            for t in lobby.teachers
        ]
        if not players and not teachers:
            return
        # Sent to everyone including the players in it — `RemotePlayers.setState`
        # no-ops on an unknown id, and self has no remote entry — which keeps the
        # payload identical for every recipient and so encodable exactly once.
        await self._broadcaster.broadcast(
            lobby, {"type": "players_state", "players": players, "teachers": teachers},
        )

    async def _snapshot_loop(self, lobby_id: str) -> None:
        dt = 1.0 / SNAPSHOT_HZ
        try:
            while True:
                await asyncio.sleep(dt)
                lobby = self._lobby_registry.get(lobby_id)
                if lobby is None or not lobby.conns or lobby.world is None:
                    return  # restarts on next game start
                await self._push_snapshot(lobby)
        finally:
            self._snapshot_tasks.pop(lobby_id, None)
