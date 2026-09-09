from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.dtos.cosmetic_item_dto import CosmeticItemDto
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog


@dataclass
class GetCosmeticCatalogQuery(IQuery[list[CosmeticItemDto]]):
    pass


class GetCosmeticCatalogHandler(IQueryHandler[GetCosmeticCatalogQuery, list[CosmeticItemDto]]):
    def __init__(self, catalog: CosmeticCatalog) -> None:
        self._catalog = catalog

    async def handle(self, query: GetCosmeticCatalogQuery) -> list[CosmeticItemDto]:
        return [
            CosmeticItemDto(
                id=it.id, category=it.category, name=it.name, price=it.price,
                rarity=it.rarity, asset_ref=it.asset_ref, default=it.default,
            )
            for it in self._catalog.items()
        ]
