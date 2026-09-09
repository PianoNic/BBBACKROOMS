from __future__ import annotations

from app.domain.accounts.account import Account
from app.domain.accounts.account_repository import IAccountRepository
from app.infrastructure.persistence.engine import DatabaseEngine
from app.infrastructure.persistence.models import AchievementUnlock, CosmeticEquipped, CosmeticOwnership, Profile
from app.infrastructure.persistence.models import Account as AccountModel


def _to_domain(row: AccountModel) -> Account:
    return Account(
        id=row.id,
        provider=row.provider,
        provider_subject=row.provider_subject,
        display_name=row.display_name,
    )


class PeeweeAccountRepository(IAccountRepository):
    def __init__(self, engine: DatabaseEngine) -> None:
        self._engine = engine

    async def upsert(self, provider: str, subject: str, display_name: str | None) -> Account:
        async with self._engine.database.aio_atomic():
            try:
                acct = await AccountModel.aio_get(
                    (AccountModel.provider == provider) & (AccountModel.provider_subject == subject)
                )
                acct.display_name = display_name
                await acct.aio_save()
            except AccountModel.DoesNotExist:
                acct = await AccountModel.aio_create(
                    provider=provider, provider_subject=subject,
                    display_name=display_name,
                )
            return _to_domain(acct)

    async def get(self, account_id: int) -> Account | None:
        try:
            acct = await AccountModel.aio_get(AccountModel.id == account_id)
        except AccountModel.DoesNotExist:
            return None
        return _to_domain(acct)

    async def delete(self, account_id: int) -> bool:
        async with self._engine.database.aio_atomic():
            await Profile.delete().where(Profile.account == account_id).aio_execute()
            await CosmeticOwnership.delete().where(CosmeticOwnership.account == account_id).aio_execute()
            await CosmeticEquipped.delete().where(CosmeticEquipped.account == account_id).aio_execute()
            await AchievementUnlock.delete().where(AchievementUnlock.account == account_id).aio_execute()
            removed = await AccountModel.delete().where(AccountModel.id == account_id).aio_execute()
        return removed > 0
