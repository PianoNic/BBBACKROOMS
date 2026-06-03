"""Broadcast the win/lose result with per-player rewards.

The shared scoreboard is built once, then each connection is sent its OWN copy
with its `selfRewards` block attached (rewards are per-self, never broadcast to
everyone). The computed rewards are cached on the lobby so a player who
reconnects into a decided round still sees their level-up screen.
"""
from __future__ import annotations

from app.domain.lobby import Lobby
from app.services._helpers import send_safe
from app.services.scoreboard import build_scoreboard, compute_rewards


async def broadcast_endgame(lobby: Lobby, result: str) -> None:
    """Send `game_won`/`game_lost` individually so each player gets rewards.

    `result` is "won" or "lost"; the packet type is `game_<result>`."""
    shared = build_scoreboard(lobby, result)
    rewards = compute_rewards(lobby, result)
    lobby.round_rewards = rewards
    lobby.rewards_applied = True  # Stage C gates the account write on this flag

    pkt_type = f"game_{result}"
    for p in lobby.conns.values():
        await send_safe(p, {
            "type": pkt_type,
            "scoreboard": {**shared, "selfRewards": rewards.get(p.id)},
        })
