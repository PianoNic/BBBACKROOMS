from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.infrastructure.persistence.models import CosmeticEquipped, CosmeticOwnership
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_cosmetic_repository import PeeweeCosmeticRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository


async def _account(account_engine, subject: str = "sub-1") -> int:
    accounts = PeeweeAccountRepository(account_engine)
    acct = await accounts.upsert("google", subject, "Hans Ueli")
    profiles = PeeweeProfileRepository(account_engine)
    await profiles.ensure(acct.id)
    return acct.id


async def test_get_owned_unions_stored_rows_with_free_defaults(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    account_id = await _account(account_engine)

    await CosmeticOwnership.aio_create(account=account_id, cosmetic_id="body_hazmat")

    owned = await cosmetics.get_owned(account_id)
    assert owned == {"body_hazmat"} | catalog.default_ids()


async def test_get_equipped_fills_empty_slots_and_drops_invalid(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    account_id = await _account(account_engine)

    await CosmeticEquipped.aio_create(account=account_id, category="body", cosmetic_id="body_hazmat")
    await CosmeticEquipped.aio_create(account=account_id, category="hat", cosmetic_id="body_hazmat")

    equipped = await cosmetics.get_equipped(account_id)
    assert equipped["body"] == "body_hazmat"
    assert "hat" not in equipped
    assert equipped["title"] == catalog.default_equipped()["title"]
    assert "facePattern" not in equipped
    fresh_account_id = await _account(account_engine, subject="sub-2")
    assert await cosmetics.get_equipped(fresh_account_id) == catalog.default_equipped()


async def test_set_equipped_upserts_without_duplicating_rows(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    account_id = await _account(account_engine)

    await cosmetics.set_equipped(account_id, "body", "body_hazmat")
    await cosmetics.set_equipped(account_id, "body", "body_camo")

    rows = list(
        await CosmeticEquipped.select()
        .where((CosmeticEquipped.account == account_id) & (CosmeticEquipped.category == "body"))
        .aio_execute()
    )
    assert len(rows) == 1
    assert rows[0].cosmetic_id == "body_camo"


async def test_purchase_succeeds_and_deducts_coins(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    profiles = PeeweeProfileRepository(account_engine)
    account_id = await _account(account_engine)
    await profiles.apply_round_rewards(account_id, 0, 500)
    item = catalog.get("body_hazmat")

    ok, balance, reason = await cosmetics.purchase(account_id, item)

    assert (ok, reason) == (True, "ok")
    assert balance == 500 - item.price
    prof = await profiles.get(account_id)
    assert prof.coins == balance


async def test_purchase_already_owned_leaves_balance_unchanged(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    profiles = PeeweeProfileRepository(account_engine)
    account_id = await _account(account_engine)
    await profiles.apply_round_rewards(account_id, 0, 500)
    item = catalog.get("body_hazmat")
    await cosmetics.purchase(account_id, item)
    balance_after_first_buy = (await profiles.get(account_id)).coins

    ok, balance, reason = await cosmetics.purchase(account_id, item)

    assert (ok, reason) == (False, "owned")
    assert balance == balance_after_first_buy
    prof = await profiles.get(account_id)
    assert prof.coins == balance_after_first_buy


async def test_purchase_insufficient_balance_leaves_balance_unchanged(account_engine):
    catalog = CosmeticCatalog()
    cosmetics = PeeweeCosmeticRepository(account_engine, catalog)
    profiles = PeeweeProfileRepository(account_engine)
    account_id = await _account(account_engine)
    item = catalog.get("body_hazmat")

    ok, balance, reason = await cosmetics.purchase(account_id, item)

    assert (ok, reason) == (False, "insufficient")
    assert balance == 0
    prof = await profiles.get(account_id)
    assert prof.coins == 0
