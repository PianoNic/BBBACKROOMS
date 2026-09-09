from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.dtos.version_dto import VersionDto


@dataclass
class GetVersionQuery(IQuery[VersionDto]):
    pass


class GetVersionHandler(IQueryHandler[GetVersionQuery, VersionDto]):
    def __init__(self, version: str) -> None:
        self._version = version

    async def handle(self, query: GetVersionQuery) -> VersionDto:
        return VersionDto(version=self._version)
