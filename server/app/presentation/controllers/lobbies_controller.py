from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from mediatorx import Mediator
from pydantic import BaseModel

from app.application.commands.create_lobby_command import CreateLobbyCommand
from app.application.dtos.created_lobby_dto import CreatedLobbyDto
from app.application.dtos.lobby_summary_dto import LobbySummaryDto
from app.application.queries.list_lobbies_query import ListLobbiesQuery
from app.presentation.controller import controller
from app.presentation.controllers.auth_controller import SESSION_COOKIE
from app.presentation.dependencies import get_mediator

router = APIRouter(tags=["lobbies"])


class CreateLobbyRequest(BaseModel):
    name: str = ""
    maxPlayers: int = 8
    password: str | None = None


@controller(router)
class LobbiesController:
    mediator: Mediator = Depends(get_mediator)

    @router.get("/lobbies", response_model=list[LobbySummaryDto])
    async def get_lobbies(self) -> list[LobbySummaryDto]:
        return await self.mediator.send(ListLobbiesQuery())

    @router.post("/lobbies")
    async def post_lobby(self, req: CreateLobbyRequest, request: Request):
        result = await self.mediator.send(CreateLobbyCommand(
            request.cookies.get(SESSION_COOKIE), req.name, req.maxPlayers, req.password,
        ))
        if result.status == "blocked":
            return JSONResponse({"error": "account blocked"}, status_code=403)
        return result.lobby
