from __future__ import annotations

from abc import ABC, abstractmethod

from app.application.abstractions.oauth_provider import IOAuthProvider


class IOAuthProviderFactory(ABC):
    @abstractmethod
    def get(self, name: str) -> IOAuthProvider | None: ...

    @abstractmethod
    def enabled(self) -> dict[str, bool]: ...
