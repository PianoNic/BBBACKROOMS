from pydantic import BaseModel


class EquipCosmeticResultDto(BaseModel):
    ok: bool
    reason: str | None = None
