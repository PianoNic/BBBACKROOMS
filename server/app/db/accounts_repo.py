from __future__ import annotations

from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.infrastructure.configuration.settings import settings
from app.infrastructure.persistence.engine import database_engine
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository

_accounts = PeeweeAccountRepository(database_engine)
_profiles = PeeweeProfileRepository(database_engine)
_blocklist = BlockedSubjectPolicy.from_raw(settings.blocked_subjects)


async def get_account(account_id: int):
    return await _accounts.get(account_id)


async def is_account_blocked(account_id: int) -> bool:
    acct = await get_account(account_id)
    return acct is not None and _blocklist.is_blocked(acct.provider, acct.provider_subject)


async def get_profile(account_id: int):
    return await _profiles.get(account_id)


async def apply_round_rewards(account_id: int, xp_earned: int, coins_earned: int) -> tuple[int, int, int]:
    return await _profiles.apply_round_rewards(account_id, xp_earned, coins_earned)
