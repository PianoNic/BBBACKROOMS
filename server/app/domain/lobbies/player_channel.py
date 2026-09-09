from __future__ import annotations

from abc import ABC, abstractmethod


class IPlayerChannel(ABC):
    @abstractmethod
    async def send_json(self, payload: dict) -> None: ...

    @abstractmethod
    async def send_text(self, payload: str) -> None: ...
