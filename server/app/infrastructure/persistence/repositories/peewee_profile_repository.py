from __future__ import annotations

from app.db.models import Profile as ProfileModel
from app.domain.accounts.profile import Profile
from app.domain.accounts.profile_repository import IProfileRepository
from app.infrastructure.persistence.engine import DatabaseEngine


def _to_domain(row: ProfileModel) -> Profile:
    return Profile(account_id=row.account_id, xp=row.xp, coins=row.coins)


class PeeweeProfileRepository(IProfileRepository):
    def __init__(self, engine: DatabaseEngine) -> None:
        self._engine = engine

    async def ensure(self, account_id: int) -> Profile:
        try:
            row = await ProfileModel.aio_get(ProfileModel.account == account_id)
        except ProfileModel.DoesNotExist:
            row = await ProfileModel.aio_create(account=account_id, xp=0, coins=0)
        return _to_domain(row)

    async def get(self, account_id: int) -> Profile | None:
        try:
            row = await ProfileModel.aio_get(ProfileModel.account == account_id)
        except ProfileModel.DoesNotExist:
            return None
        return _to_domain(row)

    async def add_rewards(self, account_id: int, xp_delta: int, coins_delta: int) -> tuple[int, int]:
        await (
            ProfileModel.update(xp=ProfileModel.xp + xp_delta, coins=ProfileModel.coins + coins_delta)
            .where(ProfileModel.account == account_id)
            .aio_execute()
        )
        row = await ProfileModel.aio_get(ProfileModel.account == account_id)
        return row.xp, row.coins

    async def apply_round_rewards(
        self, account_id: int, xp_earned: int, coins_earned: int,
    ) -> tuple[int, int, int]:
        async with self._engine.database.aio_atomic():
            row = await self.ensure(account_id)
            xp_before = row.xp
            await (
                ProfileModel.update(xp=ProfileModel.xp + xp_earned, coins=ProfileModel.coins + coins_earned)
                .where(ProfileModel.account == account_id)
                .aio_execute()
            )
            after = await ProfileModel.aio_get(ProfileModel.account == account_id)
            return xp_before, after.xp, after.coins
