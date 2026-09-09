from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Achievement:
    id: str
    name: str
    description: str
    coins: int
    icon: str  # emoji shown on the scoreboard card
