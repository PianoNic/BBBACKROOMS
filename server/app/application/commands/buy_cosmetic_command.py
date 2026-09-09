import logging
from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.buy_cosmetic_result_dto import BuyCosmeticResultDto
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository

log = logging.getLogger("bbb")


@dataclass
class BuyCosmeticCommand(ICommand[BuyCosmeticResultDto]):
    session_token: str | None
    cosmetic_id: str


class BuyCosmeticHandler(ICommandHandler[BuyCosmeticCommand, BuyCosmeticResultDto]):
    def __init__(
        self,
        token_service: ITokenService,
        cosmetics: ICosmeticRepository,
        catalog: CosmeticCatalog,
        engine: IDatabaseAvailability,
    ) -> None:
        self._token_service = token_service
        self._cosmetics = cosmetics
        self._catalog = catalog
        self._engine = engine

    async def handle(self, command: BuyCosmeticCommand) -> BuyCosmeticResultDto:
        item = self._catalog.get(command.cosmetic_id)
        if item is None:
            return BuyCosmeticResultDto(ok=False, reason="unknown", balance=0)
        account_id = self._token_service.read_account_id(command.session_token, "session")
        if account_id is None or not self._engine.is_available:
            return BuyCosmeticResultDto(ok=False, reason="guest", balance=0)
        try:
            ok, balance, reason = await self._cosmetics.purchase(account_id, item)
        except Exception as exc:  # noqa: BLE001
            log.warning("shop buy failed: %s", exc)
            ok, balance, reason = False, 0, "error"
        return BuyCosmeticResultDto(ok=ok, reason=reason, balance=balance)
