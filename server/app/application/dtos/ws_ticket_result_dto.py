from typing import Literal

from pydantic import BaseModel


class WsTicketResultDto(BaseModel):
    status: Literal["ok", "unauthenticated", "blocked"]
    ticket: str | None = None
