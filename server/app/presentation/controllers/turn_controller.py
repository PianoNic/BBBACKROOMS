from fastapi import APIRouter, Depends
from mediatorx import Mediator

from app.application.queries.get_ice_servers_query import GetIceServersQuery
from app.presentation.controller import controller
from app.presentation.dependencies import get_mediator

router = APIRouter(tags=["turn"])


@controller(router)
class TurnController:
    mediator: Mediator = Depends(get_mediator)

    @router.get("/turn-credentials")
    async def turn_credentials(self) -> dict:
        return await self.mediator.send(GetIceServersQuery())
