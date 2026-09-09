from pydantic import BaseModel, ConfigDict, Field


class CosmeticItemDto(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    category: str
    name: str
    price: int
    rarity: str
    asset_ref: str = Field(serialization_alias="assetRef")
    default: bool
