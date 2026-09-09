from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.account_dto import AccountDto
from app.application.dtos.current_account_dto import CurrentAccountDto
from app.domain.accounts.account_repository import IAccountRepository
from app.domain.accounts.profile_repository import IProfileRepository
from app.domain.progression.level_calculator import LevelCalculator


@dataclass
class GetCurrentAccountQuery(IQuery[CurrentAccountDto]):
    session_token: str | None


class GetCurrentAccountHandler(IQueryHandler[GetCurrentAccountQuery, CurrentAccountDto]):
    def __init__(
        self,
        token_service: ITokenService,
        accounts: IAccountRepository,
        profiles: IProfileRepository,
        levels: LevelCalculator,
        engine: IDatabaseAvailability,
    ) -> None:
        self._token_service = token_service
        self._accounts = accounts
        self._profiles = profiles
        self._levels = levels
        self._engine = engine

    async def handle(self, query: GetCurrentAccountQuery) -> CurrentAccountDto:
        account_id = self._token_service.read_account_id(query.session_token, "session")
        if account_id is None or not self._engine.is_available:
            return CurrentAccountDto(account=None)
        acct = await self._accounts.get(account_id)
        if acct is None:
            return CurrentAccountDto(account=None)
        prof = await self._profiles.ensure(account_id)
        level, xp_into, xp_for_next = self._levels.level_from_total(prof.xp)
        return CurrentAccountDto(account=AccountDto(
            account_id=acct.id,
            provider=acct.provider,
            display_name=acct.display_name,
            xp=prof.xp,
            coins=prof.coins,
            level=level,
            xp_into_level=xp_into,
            xp_for_next_level=xp_for_next,
        ))
