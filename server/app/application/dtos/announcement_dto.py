from typing import Literal

from pydantic import BaseModel


class AnnouncementDto(BaseModel):
    id: str
    date: str
    title: str
    body: str
    pinned: bool = False
    level: Literal["info", "important"] = "info"
