from pydantic import BaseModel

from app.application.dtos.account_dto import AccountDto


class CurrentAccountDto(BaseModel):
    account: AccountDto | None
