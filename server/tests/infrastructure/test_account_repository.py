from app.infrastructure.persistence.models import AchievementUnlock, Account, CosmeticEquipped, CosmeticOwnership, Profile
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository


def test_account_model_has_no_email():
    assert set(Account._meta.fields) == {
        "id", "provider", "provider_subject", "display_name", "created_at",
    }


async def test_upsert_keeps_one_row_with_latest_display_name(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    await accounts.upsert("google", "sub-1", "Hans Ueli")
    acct = await accounts.upsert("google", "sub-1", "Hans U.")

    rows = list(await Account.select().aio_execute())
    assert len(rows) == 1
    assert rows[0].display_name == "Hans U."
    assert acct.display_name == "Hans U."


async def test_delete_cascades_related_rows(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)

    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")
    await profiles.ensure(acct.id)
    await CosmeticOwnership.aio_create(account=acct.id, cosmetic_id="c1")
    await CosmeticEquipped.aio_create(account=acct.id, category="body", cosmetic_id="c1")
    await AchievementUnlock.aio_create(account=acct.id, achievement_id="a1")

    assert await accounts.delete(acct.id) is True

    for Model in (Account, Profile, CosmeticOwnership, CosmeticEquipped, AchievementUnlock):
        assert list(await Model.select().aio_execute()) == []

    assert await accounts.get(acct.id) is None


async def test_profile_ensure_is_idempotent(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")

    first = await profiles.ensure(acct.id)
    second = await profiles.ensure(acct.id)

    assert first == second
    rows = list(await Profile.select().where(Profile.account == acct.id).aio_execute())
    assert len(rows) == 1


async def test_apply_round_rewards_returns_before_and_after(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")

    xp_before, xp_after, coins_after = await profiles.apply_round_rewards(acct.id, 40, 10)

    assert (xp_before, xp_after, coins_after) == (0, 40, 10)
