from __future__ import annotations

from dataclasses import dataclass

from mediatorx import INotification

from app.domain.lobbies.lobby import Lobby


@dataclass
class RoundEndedNotification(INotification):
    lobby: Lobby
    result: str
    rewards: dict[str, dict]
    duration_ms: int
