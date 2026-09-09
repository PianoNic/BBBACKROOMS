from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.accounts.profile import Profile


class IProfileRepository(ABC):
    @abstractmethod
    async def ensure(self, account_id: int) -> Profile: ...

    @abstractmethod
    async def get(self, account_id: int) -> Profile | None: ...

    @abstractmethod
    async def add_rewards(self, account_id: int, xp_delta: int, coins_delta: int) -> tuple[int, int]: ...

    @abstractmethod
    async def apply_round_rewards(
        self, account_id: int, xp_earned: int, coins_earned: int,
    ) -> tuple[int, int, int]: ...
