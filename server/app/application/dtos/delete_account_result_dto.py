from typing import Literal

from pydantic import BaseModel


class DeleteAccountResultDto(BaseModel):
    status: Literal["ok", "unauthenticated", "unavailable"]
