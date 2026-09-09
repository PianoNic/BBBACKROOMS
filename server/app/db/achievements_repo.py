from __future__ import annotations

from app.infrastructure.persistence.engine import database_engine
from app.infrastructure.persistence.repositories.peewee_achievement_repository import PeeweeAchievementRepository

_achievements = PeeweeAchievementRepository(database_engine)


async def unlock_new(account_id: int, achievement_ids: list[str]) -> list[str]:
    return await _achievements.unlock_new(account_id, achievement_ids)
