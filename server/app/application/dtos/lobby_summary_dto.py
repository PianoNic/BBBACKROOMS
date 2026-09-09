from pydantic import BaseModel, ConfigDict, Field


class LobbySummaryDto(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    players: int
    max_players: int = Field(serialization_alias="maxPlayers")
    has_password: bool = Field(serialization_alias="hasPassword")
    status: str
