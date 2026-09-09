from fastapi import APIRouter, Depends
from mediatorx import Mediator

from app.application.dtos.health_dto import HealthDto
from app.application.dtos.version_dto import VersionDto
from app.application.queries.get_health_query import GetHealthQuery
from app.application.queries.get_version_query import GetVersionQuery
from app.presentation.controller import controller
from app.presentation.dependencies import get_mediator

router = APIRouter(tags=["App"])


@controller(router)
class HealthController:
    mediator: Mediator = Depends(get_mediator)

    @router.get("/healthz", response_model=HealthDto)
    async def healthz(self) -> HealthDto:
        return await self.mediator.send(GetHealthQuery())

    @router.get("/version", response_model=VersionDto)
    async def version(self) -> VersionDto:
        return await self.mediator.send(GetVersionQuery())
