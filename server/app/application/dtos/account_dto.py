from pydantic import BaseModel, ConfigDict, Field


class AccountDto(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    account_id: int = Field(serialization_alias="accountId")
    provider: str = Field(serialization_alias="provider")
    display_name: str | None = Field(serialization_alias="displayName")
    xp: int = Field(serialization_alias="xp")
    coins: int = Field(serialization_alias="coins")
    level: int = Field(serialization_alias="level")
    xp_into_level: int = Field(serialization_alias="xpIntoLevel")
    xp_for_next_level: int = Field(serialization_alias="xpForNextLevel")
