from __future__ import annotations

from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.domain.cosmetics.cosmetic_item import CosmeticItem
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository
from app.infrastructure.persistence.engine import DatabaseEngine
from app.infrastructure.persistence.models import CosmeticEquipped, CosmeticOwnership, Profile


class PeeweeCosmeticRepository(ICosmeticRepository):
    def __init__(self, engine: DatabaseEngine, catalog: CosmeticCatalog) -> None:
        self._engine = engine
        self._catalog = catalog

    async def get_owned(self, account_id: int) -> set[str]:
        rows = await (
            CosmeticOwnership.select(CosmeticOwnership.cosmetic_id)
            .where(CosmeticOwnership.account == account_id)
            .aio_execute()
        )
        return {r.cosmetic_id for r in rows} | self._catalog.default_ids()

    async def get_equipped(self, account_id: int) -> dict[str, str]:
        rows = await (
            CosmeticEquipped.select()
            .where(CosmeticEquipped.account == account_id)
            .aio_execute()
        )
        equipped = {r.category: r.cosmetic_id for r in rows}
        for category, cosmetic_id in self._catalog.default_equipped().items():
            equipped.setdefault(category, cosmetic_id)
        return self._catalog.validate_equipped(equipped)

    async def set_equipped(self, account_id: int, category: str, cosmetic_id: str) -> None:
        async with self._engine.database.aio_atomic():
            updated = await (
                CosmeticEquipped.update(cosmetic_id=cosmetic_id)
                .where(
                    (CosmeticEquipped.account == account_id)
                    & (CosmeticEquipped.category == category)
                )
                .aio_execute()
            )
            if not updated:
                await CosmeticEquipped.insert(
                    account=account_id, category=category, cosmetic_id=cosmetic_id,
                ).aio_execute()

    async def purchase(self, account_id: int, item: CosmeticItem) -> tuple[bool, int, str]:
        async with self._engine.database.aio_atomic():
            already = await (
                CosmeticOwnership.select()
                .where(
                    (CosmeticOwnership.account == account_id)
                    & (CosmeticOwnership.cosmetic_id == item.id)
                )
                .aio_execute()
            )
            prof = await Profile.aio_get(Profile.account == account_id)
            if list(already):
                return False, prof.coins, "owned"
            if prof.coins < item.price:
                return False, prof.coins, "insufficient"
            await (
                Profile.update(coins=Profile.coins - item.price)
                .where(Profile.account == account_id)
                .aio_execute()
            )
            await CosmeticOwnership.insert(
                account=account_id, cosmetic_id=item.id,
            ).aio_execute()
            after = await Profile.aio_get(Profile.account == account_id)
            return True, after.coins, "ok"
