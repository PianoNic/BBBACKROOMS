from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_achievement_repository import (
    PeeweeAchievementRepository,
)


async def _account(account_engine) -> int:
    accounts = PeeweeAccountRepository(account_engine)
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")
    return acct.id


async def test_unlock_new_inserts_only_unowned_ids_and_preserves_order(account_engine):
    achievements = PeeweeAchievementRepository(account_engine)
    account_id = await _account(account_engine)

    new_ids = await achievements.unlock_new(account_id, ["ach_a", "ach_b", "ach_c"])
    assert new_ids == ["ach_a", "ach_b", "ach_c"]

    more = await achievements.unlock_new(account_id, ["ach_b", "ach_d"])
    assert more == ["ach_d"]

    unlocked = await achievements.get_unlocked(account_id)
    assert unlocked == {"ach_a", "ach_b", "ach_c", "ach_d"}


async def test_unlock_new_is_a_no_op_for_empty_list(account_engine):
    achievements = PeeweeAchievementRepository(account_engine)
    account_id = await _account(account_engine)

    result = await achievements.unlock_new(account_id, [])
    assert result == []
    assert await achievements.get_unlocked(account_id) == set()


async def test_unlock_new_is_idempotent_on_second_call(account_engine):
    achievements = PeeweeAchievementRepository(account_engine)
    account_id = await _account(account_engine)

    await achievements.unlock_new(account_id, ["ach_a"])
    second = await achievements.unlock_new(account_id, ["ach_a"])

    assert second == []
    assert await achievements.get_unlocked(account_id) == {"ach_a"}
