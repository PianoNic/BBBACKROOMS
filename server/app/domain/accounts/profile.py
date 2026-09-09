from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Profile:
    account_id: int
    xp: int
    coins: int
