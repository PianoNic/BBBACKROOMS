from pydantic import BaseModel, ConfigDict, Field


class ShopStateDto(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    signed_in: bool = Field(serialization_alias="signedIn")
    balance: int
    owned: list[str]
    equipped: dict[str, str]
