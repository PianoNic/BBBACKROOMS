from typing import Literal

from pydantic import BaseModel


class OAuthCallbackDto(BaseModel):
    status: Literal["ok", "error", "blocked"]
    session_token: str | None = None
