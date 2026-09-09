from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.accounts.account import Account


class IAccountRepository(ABC):
    @abstractmethod
    async def get(self, account_id: int) -> Account | None: ...

    @abstractmethod
    async def upsert(self, provider: str, subject: str, display_name: str | None) -> Account: ...

    @abstractmethod
    async def delete(self, account_id: int) -> bool: ...
