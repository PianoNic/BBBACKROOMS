from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.abstractions.announcement_source import IAnnouncementSource
from app.application.dtos.announcement_dto import AnnouncementDto


@dataclass
class GetAnnouncementsQuery(IQuery[list[AnnouncementDto]]):
    pass


class GetAnnouncementsHandler(IQueryHandler[GetAnnouncementsQuery, list[AnnouncementDto]]):
    def __init__(self, source: IAnnouncementSource) -> None:
        self._source = source

    async def handle(self, query: GetAnnouncementsQuery) -> list[AnnouncementDto]:
        return await self._source.load()
