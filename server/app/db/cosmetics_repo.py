from __future__ import annotations

from app.domain.cosmetics.cosmetic_catalog import cosmetic_catalog
from app.domain.cosmetics.cosmetic_item import CosmeticItem
from app.infrastructure.persistence.engine import database_engine
from app.infrastructure.persistence.repositories.peewee_cosmetic_repository import PeeweeCosmeticRepository

_cosmetics = PeeweeCosmeticRepository(database_engine, cosmetic_catalog)


async def get_owned(account_id: int) -> set[str]:
    return await _cosmetics.get_owned(account_id)


async def get_equipped(account_id: int) -> dict[str, str]:
    return await _cosmetics.get_equipped(account_id)


async def set_equipped(account_id: int, category: str, cosmetic_id: str) -> None:
    await _cosmetics.set_equipped(account_id, category, cosmetic_id)


async def purchase(account_id: int, item: CosmeticItem) -> tuple[bool, int, str]:
    return await _cosmetics.purchase(account_id, item)
