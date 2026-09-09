from fastapi import APIRouter, Depends, Request
from mediatorx import Mediator
from pydantic import BaseModel, Field

from app.application.commands.buy_cosmetic_command import BuyCosmeticCommand
from app.application.commands.equip_cosmetic_command import EquipCosmeticCommand
from app.application.dtos.buy_cosmetic_result_dto import BuyCosmeticResultDto
from app.application.dtos.cosmetic_item_dto import CosmeticItemDto
from app.application.dtos.equip_cosmetic_result_dto import EquipCosmeticResultDto
from app.application.dtos.shop_state_dto import ShopStateDto
from app.application.queries.get_cosmetic_catalog_query import GetCosmeticCatalogQuery
from app.application.queries.get_shop_state_query import GetShopStateQuery
from app.presentation.controller import controller
from app.presentation.controllers.auth_controller import SESSION_COOKIE
from app.presentation.dependencies import get_mediator

router = APIRouter(prefix="/shop", tags=["shop"])


class BuyCosmeticRequest(BaseModel):
    cosmeticId: str = Field(max_length=64)


class EquipCosmeticRequest(BaseModel):
    category: str = Field(max_length=20)
    cosmeticId: str = Field(max_length=64)


@controller(router)
class ShopController:
    mediator: Mediator = Depends(get_mediator)

    @router.get("/catalog", response_model=list[CosmeticItemDto])
    async def catalog(self) -> list[CosmeticItemDto]:
        return await self.mediator.send(GetCosmeticCatalogQuery())

    @router.get("/me", response_model=ShopStateDto)
    async def me(self, request: Request) -> ShopStateDto:
        return await self.mediator.send(GetShopStateQuery(request.cookies.get(SESSION_COOKIE)))

    @router.post("/buy", response_model=BuyCosmeticResultDto)
    async def buy(self, request: Request, body: BuyCosmeticRequest) -> BuyCosmeticResultDto:
        return await self.mediator.send(
            BuyCosmeticCommand(request.cookies.get(SESSION_COOKIE), body.cosmeticId)
        )

    @router.post("/equip", response_model=EquipCosmeticResultDto, response_model_exclude_none=True)
    async def equip(self, request: Request, body: EquipCosmeticRequest) -> EquipCosmeticResultDto:
        return await self.mediator.send(
            EquipCosmeticCommand(request.cookies.get(SESSION_COOKIE), body.category, body.cosmeticId)
        )
