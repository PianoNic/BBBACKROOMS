from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.dtos.health_dto import HealthDto


@dataclass
class GetHealthQuery(IQuery[HealthDto]):
    pass


class GetHealthHandler(IQueryHandler[GetHealthQuery, HealthDto]):
    async def handle(self, query: GetHealthQuery) -> HealthDto:
        return HealthDto(status="ok")
