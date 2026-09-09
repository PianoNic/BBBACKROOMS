import httpx
import pytest
from fastapi import FastAPI
from mediatorx import DictResolver, Mediator

from app.application.commands.buy_cosmetic_command import BuyCosmeticCommand, BuyCosmeticHandler
from app.application.commands.equip_cosmetic_command import EquipCosmeticCommand, EquipCosmeticHandler
from app.application.queries.get_cosmetic_catalog_query import (
    GetCosmeticCatalogHandler,
    GetCosmeticCatalogQuery,
)
from app.application.queries.get_shop_state_query import GetShopStateHandler, GetShopStateQuery
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_cosmetic_repository import PeeweeCosmeticRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository
from app.infrastructure.security.hmac_token_service import HmacTokenService
from app.presentation.controllers.auth_controller import SESSION_COOKIE
from app.presentation.controllers.shop_controller import router as shop_router
from app.presentation.dependencies import get_mediator


def _build_mediator(engine) -> Mediator:
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(engine, catalog)
    profiles = PeeweeProfileRepository(engine)
    token_service = HmacTokenService(b"test-secret", 3600, 60)

    resolver = DictResolver()
    resolver.add_factory(GetCosmeticCatalogHandler, lambda: GetCosmeticCatalogHandler(catalog))
    resolver.add_factory(
        GetShopStateHandler,
        lambda: GetShopStateHandler(token_service, cosmetics, profiles, catalog, engine),
    )
    resolver.add_factory(
        BuyCosmeticHandler,
        lambda: BuyCosmeticHandler(token_service, cosmetics, catalog, engine),
    )
    resolver.add_factory(
        EquipCosmeticHandler,
        lambda: EquipCosmeticHandler(token_service, cosmetics, catalog, engine),
    )

    mediator = Mediator(resolver=resolver)
    mediator.register(GetCosmeticCatalogQuery, GetCosmeticCatalogHandler)
    mediator.register(GetShopStateQuery, GetShopStateHandler)
    mediator.register(BuyCosmeticCommand, BuyCosmeticHandler)
    mediator.register(EquipCosmeticCommand, EquipCosmeticHandler)
    return mediator


@pytest.fixture
def api_client_factory(account_engine):
    test_mediator = _build_mediator(account_engine)

    def _build() -> httpx.AsyncClient:
        app = FastAPI()
        app.include_router(shop_router)
        app.dependency_overrides[get_mediator] = lambda: test_mediator
        transport = httpx.ASGITransport(app=app)
        return httpx.AsyncClient(transport=transport, base_url="http://testserver")

    return _build, PeeweeAccountRepository(account_engine), PeeweeProfileRepository(account_engine)


async def test_catalog_returns_items_with_seven_keys_in_order(api_client_factory):
    build_client, _accounts, _profiles = api_client_factory
    async with build_client() as client:
        resp = await client.get("/shop/catalog")
        body = resp.json()
        assert isinstance(body, list)
        assert list(body[0].keys()) == ["id", "category", "name", "price", "rarity", "assetRef", "default"]


async def test_shop_me_for_guest_returns_defaults(api_client_factory):
    build_client, _accounts, _profiles = api_client_factory
    catalog = CosmeticCatalog()
    async with build_client() as client:
        resp = await client.get("/shop/me")
        assert resp.json() == {
            "signedIn": False, "balance": 0,
            "owned": sorted(catalog.default_ids()), "equipped": catalog.default_equipped(),
        }


async def test_equip_success_returns_exactly_ok_true(api_client_factory):
    build_client, accounts, profiles = api_client_factory
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")
    await profiles.ensure(acct.id)
    await profiles.apply_round_rewards(acct.id, 0, 500)
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    session_token = token_service.issue_session(acct.id)

    async with build_client() as client:
        client.cookies.set(SESSION_COOKIE, session_token)
        buy_resp = await client.post("/shop/buy", json={"cosmeticId": "body_hazmat"})
        assert buy_resp.json()["ok"] is True

        equip_resp = await client.post(
            "/shop/equip", json={"category": "body", "cosmeticId": "body_hazmat"},
        )
        assert equip_resp.json() == {"ok": True}


async def test_equip_failure_returns_ok_false_with_reason(api_client_factory):
    build_client, _accounts, _profiles = api_client_factory
    async with build_client() as client:
        resp = await client.post("/shop/equip", json={"category": "body", "cosmeticId": "body_hazmat"})
        assert resp.json() == {"ok": False, "reason": "guest"}


async def test_buy_for_guest_returns_guest_reason(api_client_factory):
    build_client, _accounts, _profiles = api_client_factory
    async with build_client() as client:
        resp = await client.post("/shop/buy", json={"cosmeticId": "body_hazmat"})
        assert resp.json() == {"ok": False, "reason": "guest", "balance": 0}
