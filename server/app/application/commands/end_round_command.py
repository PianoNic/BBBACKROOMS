"""Broadcast the win/lose result with per-player rewards, persisting XP/coins
for signed-in players.

The shared scoreboard is built once; each connection is sent its OWN copy with
its `selfRewards` block. For players linked to an account (and when the DB is
up) the round's XP/coins are written and the level-up reflects their real
stored level; guests see the same numbers with `saved=false`.

`rewards_applied` guards against crediting an account twice if the end-of-round
path fires more than once.
"""
from __future__ import annotations

from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler, IMediator

from app.application.notifications.round_ended_notification import RoundEndedNotification
from app.domain.lobbies.lobby import Lobby
from app.domain.progression.scoreboard_builder import ScoreboardBuilder


@dataclass
class EndRoundCommand(ICommand[None]):
    lobby: Lobby
    result: str


class EndRoundHandler(ICommandHandler[EndRoundCommand, None]):
    def __init__(self, scoreboard_builder: ScoreboardBuilder, mediator: IMediator) -> None:
        self._scoreboard_builder = scoreboard_builder
        self._mediator = mediator

    async def handle(self, command: EndRoundCommand) -> None:
        """Send `game_won`/`game_lost` per-player with rewards. `result` is
        "won"/"lost"; the packet type is `game_<result>`."""
        lobby, result = command.lobby, command.result
        shared = self._scoreboard_builder.build(lobby, result)

        # Already finalized this round (e.g. win detected on two paths): re-send
        # the cached rewards without crediting accounts again.
        if lobby.rewards_applied:
            await self._send_each(lobby, result, shared)
            return

        rewards = self._scoreboard_builder.compute_rewards(lobby, result)
        await self._mediator.publish(
            RoundEndedNotification(lobby, result, rewards, shared["durationMs"]),
        )
        lobby.round_rewards = rewards
        lobby.rewards_applied = True
        await self._send_each(lobby, result, shared)

    async def _send_each(self, lobby: Lobby, result: str, shared: dict) -> None:
        pkt_type = f"game_{result}"
        for p in lobby.conns.values():
            try:
                await p.channel.send_json({
                    "type": pkt_type,
                    "scoreboard": {**shared, "selfRewards": lobby.round_rewards.get(p.id)},
                })
            except Exception:
                pass
