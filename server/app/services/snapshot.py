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
from app.game.lobby_store import get_lobby
from app.services.broadcast import broadcast

SNAPSHOT_HZ = 15

_snapshot_tasks: dict[str, asyncio.Task] = {}


def ensure_snapshot_loop(lobby: Lobby) -> None:
    if lobby.id in _snapshot_tasks:
        return
    _snapshot_tasks[lobby.id] = asyncio.create_task(_snapshot_loop(lobby.id))


def _round2(v: float) -> float:
    """Centimetre precision. Python renders floats at full repr — a raw
    `31.885000000000005` is 18 payload characters where `31.89` is 5."""
    return round(v, 2)


async def _push_snapshot(lobby: Lobby) -> None:
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
            "x": _round2(p.x), "z": _round2(p.z), "yaw": round(p.yaw, 3),
        })
    teachers = [
        {"id": t.id, "x": _round2(t.x), "z": _round2(t.z)}
        for t in lobby.teachers
    ]
    if not players and not teachers:
        return
    # Sent to everyone including the players in it — `RemotePlayers.setState`
    # no-ops on an unknown id, and self has no remote entry — which keeps the
    # payload identical for every recipient and so encodable exactly once.
    await broadcast(
        lobby, {"type": "players_state", "players": players, "teachers": teachers},
    )


async def _snapshot_loop(lobby_id: str) -> None:
    dt = 1.0 / SNAPSHOT_HZ
    try:
        while True:
            await asyncio.sleep(dt)
            lobby = get_lobby(lobby_id)
            if lobby is None or not lobby.conns or lobby.world is None:
                return  # restarts on next game start
            await _push_snapshot(lobby)
    finally:
        _snapshot_tasks.pop(lobby_id, None)
