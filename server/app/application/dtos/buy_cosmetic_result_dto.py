from pydantic import BaseModel


class BuyCosmeticResultDto(BaseModel):
    ok: bool
    reason: str
    balance: int
