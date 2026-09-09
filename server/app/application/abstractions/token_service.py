from __future__ import annotations

from abc import ABC, abstractmethod


class ITokenService(ABC):
    @abstractmethod
    def issue(self, claims: dict, ttl_seconds: int) -> str: ...

    @abstractmethod
    def verify(self, token: str) -> dict | None: ...

    @abstractmethod
    def issue_session(self, account_id: int) -> str: ...

    @abstractmethod
    def issue_ws_ticket(self, account_id: int) -> str: ...

    @abstractmethod
    def read_account_id(self, token: str | None, kind: str) -> int | None: ...
