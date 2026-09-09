from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.accounts.oauth_identity import OAuthIdentity


class IOAuthProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def authorize_url(self, state: str, challenge: str) -> str: ...

    @abstractmethod
    async def exchange_code(self, code: str, verifier: str) -> dict: ...

    @abstractmethod
    async def fetch_userinfo(self, access_token: str) -> OAuthIdentity: ...
