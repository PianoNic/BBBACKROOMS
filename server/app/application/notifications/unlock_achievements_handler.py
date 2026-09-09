from __future__ import annotations

import logging

from mediatorx import INotificationHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.notifications.round_ended_notification import RoundEndedNotification
from app.domain.accounts.profile_repository import IProfileRepository
from app.domain.achievements.achievement_catalog import AchievementCatalog
from app.domain.achievements.achievement_repository import IAchievementRepository
from app.domain.progression.achievement_evaluator import AchievementEvaluator

log = logging.getLogger("bbb")


class UnlockAchievementsHandler(INotificationHandler[RoundEndedNotification]):
    """Attach earned achievements to each player's reward block. Signed-in
    players only see NEW unlocks and get their coin bonus credited once;
    guests see everything they earned this round, unsaved and coinless."""

    def __init__(
        self,
        achievement_evaluator: AchievementEvaluator,
        achievements: IAchievementRepository,
        achievement_catalog: AchievementCatalog,
        profiles: IProfileRepository,
        engine: IDatabaseAvailability,
    ) -> None:
        self._achievement_evaluator = achievement_evaluator
        self._achievements = achievements
        self._achievement_catalog = achievement_catalog
        self._profiles = profiles
        self._engine = engine

    async def handle(self, notification: RoundEndedNotification) -> None:
        lobby, result, rewards, duration_ms = (
            notification.lobby, notification.result, notification.rewards, notification.duration_ms,
        )
        for p in lobby.conns.values():
            r = rewards.get(p.id)
            if r is None:
                continue
            earned = self._achievement_evaluator.evaluate_round(lobby, result, p, duration_ms)
            if p.account_id is not None and self._engine.is_available:
                try:
                    new_ids = await self._achievements.unlock_new(p.account_id, earned)
                    bonus = sum(self._achievement_catalog.get(aid).coins for aid in new_ids)
                    if bonus:
                        await self._profiles.apply_round_rewards(p.account_id, 0, bonus)
                    r["achievements"] = [
                        self._achievement_catalog.to_dto(aid, True) for aid in new_ids
                    ]
                    continue
                except Exception as exc:  # noqa: BLE001
                    log.warning("achievement persist failed for %s: %s", p.id, exc)
            r["achievements"] = [self._achievement_catalog.to_dto(aid, False) for aid in earned]
