from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.shop_state_dto import ShopStateDto
from app.domain.accounts.profile_repository import IProfileRepository
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository


@dataclass
class GetShopStateQuery(IQuery[ShopStateDto]):
    session_token: str | None


class GetShopStateHandler(IQueryHandler[GetShopStateQuery, ShopStateDto]):
    def __init__(
        self,
        token_service: ITokenService,
        cosmetics: ICosmeticRepository,
        profiles: IProfileRepository,
        catalog: CosmeticCatalog,
        engine: IDatabaseAvailability,
    ) -> None:
        self._token_service = token_service
        self._cosmetics = cosmetics
        self._profiles = profiles
        self._catalog = catalog
        self._engine = engine

    async def handle(self, query: GetShopStateQuery) -> ShopStateDto:
        account_id = self._token_service.read_account_id(query.session_token, "session")
        if account_id is None or not self._engine.is_available:
            return ShopStateDto(
                signed_in=False, balance=0,
                owned=sorted(self._catalog.default_ids()),
                equipped=self._catalog.default_equipped(),
            )
        owned = await self._cosmetics.get_owned(account_id)
        equipped = await self._cosmetics.get_equipped(account_id)
        prof = await self._profiles.get(account_id)
        return ShopStateDto(
            signed_in=True, balance=prof.coins if prof else 0,
            owned=sorted(owned), equipped=equipped,
        )
