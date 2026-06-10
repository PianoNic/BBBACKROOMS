"""Achievement unlock persistence (per account)."""
from __future__ import annotations

from app.db.engine import database
from app.db.models import AchievementUnlock


async def get_unlocked(account_id: int) -> set[str]:
    rows = await (
        AchievementUnlock.select(AchievementUnlock.achievement_id)
        .where(AchievementUnlock.account == account_id)
        .aio_execute()
    )
    return {r.achievement_id for r in rows}


async def unlock_new(account_id: int, achievement_ids: list[str]) -> list[str]:
    """Insert any not-yet-owned unlocks; returns the newly added ids (in the
    order given) so the caller can pay their coin bonuses exactly once."""
    if not achievement_ids:
        return []
    async with database.aio_atomic():
        owned = await get_unlocked(account_id)
        new_ids = [aid for aid in achievement_ids if aid not in owned]
        for aid in new_ids:
            await AchievementUnlock.aio_create(
                account=account_id, achievement_id=aid,
            )
        return new_ids
