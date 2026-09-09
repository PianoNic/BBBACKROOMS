from __future__ import annotations

import logging

from mediatorx import INotificationHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.notifications.round_ended_notification import RoundEndedNotification
from app.domain.accounts.profile_repository import IProfileRepository
from app.domain.progression.level_calculator import LevelCalculator

log = logging.getLogger("bbb")


class PersistRewardsHandler(INotificationHandler[RoundEndedNotification]):
    """For each signed-in player, credit xp/coins and rewrite their reward block
    to reflect their true before/after level. Best-effort: a DB hiccup leaves
    that player as an unsaved guest-style result and never blocks the broadcast.
    """

    def __init__(self, profiles: IProfileRepository, levels: LevelCalculator, engine: IDatabaseAvailability) -> None:
        self._profiles = profiles
        self._levels = levels
        self._engine = engine

    async def handle(self, notification: RoundEndedNotification) -> None:
        if not self._engine.is_available:
            return
        for p in notification.lobby.conns.values():
            if p.account_id is None:
                continue
            r = notification.rewards.get(p.id)
            if r is None:
                continue
            try:
                xp_before, xp_after, _coins_after = await self._profiles.apply_round_rewards(
                    p.account_id, r["xpEarned"], r["coinsEarned"],
                )
            except Exception as exc:  # noqa: BLE001
                log.warning("reward persist failed for %s: %s", p.id, exc)
                continue
            level_before, _, _ = self._levels.level_from_total(xp_before)
            level_after, xp_into, xp_for_next = self._levels.level_from_total(xp_after)
            r.update({
                "levelBefore": level_before,
                "levelAfter": level_after,
                "xpIntoLevel": xp_into,
                "xpForNextLevel": xp_for_next,
                "leveledUp": level_after > level_before,
                "saved": True,
            })
