"""Async data access for accounts + profiles.

All functions assume the database is connected (callers check
`db_available()` first). Identity key is (provider, provider_subject).
"""
from __future__ import annotations

from app.db.engine import database
from app.db.models import Account, Profile
from app.services.leveling import level_from_total


async def upsert_account(provider: str, subject: str, email: str | None, name: str | None) -> Account:
    """Create the account for (provider, subject) or update its email/name."""
    async with database.aio_atomic():
        try:
            acct = await Account.aio_get(
                (Account.provider == provider) & (Account.provider_subject == subject)
            )
            acct.email = email
            acct.display_name = name
            await acct.aio_save()
        except Account.DoesNotExist:
            acct = await Account.aio_create(
                provider=provider, provider_subject=subject,
                email=email, display_name=name,
            )
        return acct


async def ensure_profile(account_id: int) -> Profile:
    try:
        return await Profile.aio_get(Profile.account == account_id)
    except Profile.DoesNotExist:
        return await Profile.aio_create(account=account_id, xp=0, coins=0)


async def get_profile(account_id: int) -> Profile | None:
    try:
        return await Profile.aio_get(Profile.account == account_id)
    except Profile.DoesNotExist:
        return None


async def get_account(account_id: int) -> Account | None:
    try:
        return await Account.aio_get(Account.id == account_id)
    except Account.DoesNotExist:
        return None


async def add_rewards(account_id: int, xp_delta: int, coins_delta: int) -> tuple[int, int]:
    """Atomically add to xp/coins (DB-side increment, race-safe). Returns the
    new (xp, coins). Caller must have ensured the profile exists."""
    await (
        Profile.update(xp=Profile.xp + xp_delta, coins=Profile.coins + coins_delta)
        .where(Profile.account == account_id)
        .aio_execute()
    )
    prof = await Profile.aio_get(Profile.account == account_id)
    return prof.xp, prof.coins


async def account_view(account_id: int) -> dict | None:
    """The /auth/me payload: identity + progress (level derived from xp)."""
    acct = await get_account(account_id)
    if acct is None:
        return None
    prof = await ensure_profile(account_id)
    level, xp_into, xp_for_next = level_from_total(prof.xp)
    return {
        "accountId": acct.id,
        "provider": acct.provider,
        "displayName": acct.display_name,
        "email": acct.email,
        "xp": prof.xp,
        "coins": prof.coins,
        "level": level,
        "xpIntoLevel": xp_into,
        "xpForNextLevel": xp_for_next,
    }
