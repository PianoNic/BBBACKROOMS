from __future__ import annotations

from abc import ABC, abstractmethod

from app.application.dtos.announcement_dto import AnnouncementDto


class IAnnouncementSource(ABC):
    @abstractmethod
    async def load(self) -> list[AnnouncementDto]: ...
