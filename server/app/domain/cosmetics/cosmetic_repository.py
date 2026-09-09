from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.cosmetics.cosmetic_item import CosmeticItem


class ICosmeticRepository(ABC):
    @abstractmethod
    async def get_owned(self, account_id: int) -> set[str]: ...

    @abstractmethod
    async def get_equipped(self, account_id: int) -> dict[str, str]: ...

    @abstractmethod
    async def set_equipped(self, account_id: int, category: str, cosmetic_id: str) -> None: ...

    @abstractmethod
    async def purchase(self, account_id: int, item: CosmeticItem) -> tuple[bool, int, str]: ...
