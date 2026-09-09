from __future__ import annotations

from abc import ABC, abstractmethod


class IIceServerProvider(ABC):
    @abstractmethod
    async def get_ice_servers(self) -> dict: ...
