from app.application.commands.buy_cosmetic_command import BuyCosmeticCommand, BuyCosmeticHandler
from app.application.commands.equip_cosmetic_command import EquipCosmeticCommand, EquipCosmeticHandler
from app.application.dtos.shop_state_dto import ShopStateDto
from app.application.queries.get_shop_state_query import GetShopStateHandler, GetShopStateQuery
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_cosmetic_repository import PeeweeCosmeticRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository
from app.infrastructure.security.hmac_token_service import HmacTokenService

from tests.application.test_auth_handlers import UnavailableDatabase


def _token_service() -> HmacTokenService:
    return HmacTokenService(b"test-secret", 3600, 60)


async def _signed_in_account(account_engine) -> tuple[int, str, HmacTokenService]:
    accounts = PeeweeAccountRepository(account_engine)
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")
    profiles = PeeweeProfileRepository(account_engine)
    await profiles.ensure(acct.id)
    token_service = _token_service()
    return acct.id, token_service.issue_session(acct.id), token_service


async def test_get_shop_state_guest_returns_defaults(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    profiles = PeeweeProfileRepository(account_engine)
    handler = GetShopStateHandler(_token_service(), cosmetics, profiles, catalog, account_engine)

    result = await handler.handle(GetShopStateQuery(None))

    assert result == ShopStateDto(
        signed_in=False, balance=0,
        owned=sorted(catalog.default_ids()), equipped=catalog.default_equipped(),
    )


async def test_get_shop_state_returns_defaults_when_database_unavailable():
    catalog = CosmeticCatalog()
    token_service = _token_service()
    handler = GetShopStateHandler(token_service, None, None, catalog, UnavailableDatabase())

    session_token = token_service.issue_session(1)
    result = await handler.handle(GetShopStateQuery(session_token))

    assert result.signed_in is False
    assert result.balance == 0


async def test_get_shop_state_signed_in_returns_owned_and_equipped(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    profiles = PeeweeProfileRepository(account_engine)
    account_id, session_token, token_service = await _signed_in_account(account_engine)
    await profiles.apply_round_rewards(account_id, 0, 300)
    handler = GetShopStateHandler(token_service, cosmetics, profiles, catalog, account_engine)

    result = await handler.handle(GetShopStateQuery(session_token))

    assert result.signed_in is True
    assert result.balance == 300
    assert result.owned == sorted(catalog.default_ids())
    assert result.equipped == catalog.default_equipped()


async def test_buy_cosmetic_guest_is_rejected(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    handler = BuyCosmeticHandler(_token_service(), cosmetics, catalog, account_engine)

    result = await handler.handle(BuyCosmeticCommand(None, "body_hazmat"))
    assert (result.ok, result.reason, result.balance) == (False, "guest", 0)


async def test_buy_cosmetic_unknown_item_is_rejected(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    handler = BuyCosmeticHandler(_token_service(), cosmetics, catalog, account_engine)

    result = await handler.handle(BuyCosmeticCommand(None, "nope"))
    assert (result.ok, result.reason, result.balance) == (False, "unknown", 0)


async def test_buy_cosmetic_signed_in_success(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    account_id, session_token, token_service = await _signed_in_account(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    await profiles.apply_round_rewards(account_id, 0, 500)
    handler = BuyCosmeticHandler(token_service, cosmetics, catalog, account_engine)

    result = await handler.handle(BuyCosmeticCommand(session_token, "body_hazmat"))

    assert result.ok is True
    assert result.reason == "ok"
    assert result.balance == 500 - catalog.get("body_hazmat").price


async def test_buy_cosmetic_signed_in_insufficient_balance(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    _account_id, session_token, token_service = await _signed_in_account(account_engine)
    handler = BuyCosmeticHandler(token_service, cosmetics, catalog, account_engine)

    result = await handler.handle(BuyCosmeticCommand(session_token, "body_hazmat"))

    assert (result.ok, result.reason, result.balance) == (False, "insufficient", 0)


async def test_equip_cosmetic_guest_is_rejected(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    handler = EquipCosmeticHandler(_token_service(), cosmetics, catalog, account_engine)

    result = await handler.handle(EquipCosmeticCommand(None, "body", "body_hazmat"))
    assert (result.ok, result.reason) == (False, "guest")


async def test_equip_cosmetic_invalid_item_or_category_mismatch(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    _account_id, session_token, token_service = await _signed_in_account(account_engine)
    handler = EquipCosmeticHandler(token_service, cosmetics, catalog, account_engine)

    unknown = await handler.handle(EquipCosmeticCommand(session_token, "body", "nope"))
    assert (unknown.ok, unknown.reason) == (False, "invalid")

    mismatch = await handler.handle(EquipCosmeticCommand(session_token, "hat", "body_hazmat"))
    assert (mismatch.ok, mismatch.reason) == (False, "invalid")


async def test_equip_cosmetic_unowned_item_is_rejected(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    _account_id, session_token, token_service = await _signed_in_account(account_engine)
    handler = EquipCosmeticHandler(token_service, cosmetics, catalog, account_engine)

    result = await handler.handle(EquipCosmeticCommand(session_token, "body", "body_hazmat"))
    assert (result.ok, result.reason) == (False, "unowned")


async def test_equip_cosmetic_success_has_no_reason(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    account_id, session_token, token_service = await _signed_in_account(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    await profiles.apply_round_rewards(account_id, 0, 500)
    await cosmetics.purchase(account_id, catalog.get("body_hazmat"))
    handler = EquipCosmeticHandler(token_service, cosmetics, catalog, account_engine)

    result = await handler.handle(EquipCosmeticCommand(session_token, "body", "body_hazmat"))

    assert result.ok is True
    assert result.reason is None
    equipped = await cosmetics.get_equipped(account_id)
    assert equipped["body"] == "body_hazmat"
