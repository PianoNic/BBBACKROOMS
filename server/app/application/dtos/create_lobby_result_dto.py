from typing import Literal

from pydantic import BaseModel

from app.application.dtos.created_lobby_dto import CreatedLobbyDto


class CreateLobbyResultDto(BaseModel):
    status: Literal["ok", "blocked"]
    lobby: CreatedLobbyDto | None = None
