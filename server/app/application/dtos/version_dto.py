from pydantic import BaseModel


class VersionDto(BaseModel):
    version: str
