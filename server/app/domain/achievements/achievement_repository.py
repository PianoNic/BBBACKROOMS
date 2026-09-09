from __future__ import annotations

from abc import ABC, abstractmethod


class IAchievementRepository(ABC):
    @abstractmethod
    async def get_unlocked(self, account_id: int) -> set[str]: ...

    @abstractmethod
    async def unlock_new(self, account_id: int, achievement_ids: list[str]) -> list[str]: ...
