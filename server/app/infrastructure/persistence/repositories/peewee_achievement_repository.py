from __future__ import annotations

from app.db.models import AchievementUnlock
from app.domain.achievements.achievement_repository import IAchievementRepository
from app.infrastructure.persistence.engine import DatabaseEngine


class PeeweeAchievementRepository(IAchievementRepository):
    def __init__(self, engine: DatabaseEngine) -> None:
        self._engine = engine

    async def get_unlocked(self, account_id: int) -> set[str]:
        rows = await (
            AchievementUnlock.select(AchievementUnlock.achievement_id)
            .where(AchievementUnlock.account == account_id)
            .aio_execute()
        )
        return {r.achievement_id for r in rows}

    async def unlock_new(self, account_id: int, achievement_ids: list[str]) -> list[str]:
        if not achievement_ids:
            return []
        async with self._engine.database.aio_atomic():
            owned = await self.get_unlocked(account_id)
            new_ids = [aid for aid in achievement_ids if aid not in owned]
            for aid in new_ids:
                await AchievementUnlock.aio_create(
                    account=account_id, achievement_id=aid,
                )
            return new_ids
