import logging
from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.equip_cosmetic_result_dto import EquipCosmeticResultDto
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository

log = logging.getLogger("nachsitzen")


@dataclass
class EquipCosmeticCommand(ICommand[EquipCosmeticResultDto]):
    session_token: str | None
    category: str
    cosmetic_id: str


class EquipCosmeticHandler(ICommandHandler[EquipCosmeticCommand, EquipCosmeticResultDto]):
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

    async def handle(self, command: EquipCosmeticCommand) -> EquipCosmeticResultDto:
        account_id = self._token_service.read_account_id(command.session_token, "session")
        if account_id is None or not self._engine.is_available:
            return EquipCosmeticResultDto(ok=False, reason="guest")
        item = self._catalog.get(command.cosmetic_id)
        if item is None or item.category != command.category:
            return EquipCosmeticResultDto(ok=False, reason="invalid")
        owned = await self._cosmetics.get_owned(account_id)
        if command.cosmetic_id not in owned:
            return EquipCosmeticResultDto(ok=False, reason="unowned")
        try:
            await self._cosmetics.set_equipped(account_id, command.category, command.cosmetic_id)
        except Exception as exc:  # noqa: BLE001
            log.warning("shop equip failed: %s", exc)
            return EquipCosmeticResultDto(ok=False, reason="error")
        return EquipCosmeticResultDto(ok=True)
