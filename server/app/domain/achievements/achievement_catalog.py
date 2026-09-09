"""Achievement catalog — server-authoritative, like the cosmetics catalog.

Every achievement is evaluated from round counters at endgame
(`services/achievements.py`). Coin bonuses are credited once per account on
first unlock; guests see their earned achievements each round with
`saved=false` and no coins.
"""
from __future__ import annotations

from app.domain.achievements.achievement import Achievement

_ITEMS: list[Achievement] = [
    Achievement(
        "ach_erste_schicht", "Erste Schicht",
        "Beende deine erste Runde", 25, "🎒",
    ),
    Achievement(
        "ach_houdini", "Houdini",
        "Extrahiere erfolgreich durch den Schacht", 40, "🕳️",
    ),
    Achievement(
        "ach_survivor", "Überlebenskünstler",
        "Überlebe eine Runde, ohne zu sterben", 50, "🛡️",
    ),
    Achievement(
        "ach_sammler", "Sammlerherz",
        "Sammle 5 Items in einer Runde", 50, "🎁",
    ),
    Achievement(
        "ach_medic", "Schulsanitäter",
        "Belebe 3 Mitspieler in einer Runde wieder", 75, "💉",
    ),
    Achievement(
        "ach_streber", "Streber",
        "Erledige 5 Aufgaben in einer Runde", 75, "📚",
    ),
    Achievement(
        "ach_stuhlgewitter", "Stuhlgewitter",
        "Stunne 3 Lehrer in einer Runde", 75, "🪑",
    ),
    Achievement(
        "ach_speedrun", "Speedrunner",
        "Gewinne eine Runde in unter 5 Minuten", 100, "⏱️",
    ),
    Achievement(
        "ach_klassenerhalt", "Klassenerhalt",
        "Gewinne eine Runde, in der niemand stirbt", 100, "🏆",
    ),
]


class AchievementCatalog:
    def __init__(self) -> None:
        self._items = _ITEMS
        self._by_id = {a.id: a for a in _ITEMS}

    def get(self, achievement_id: str) -> Achievement | None:
        return self._by_id.get(achievement_id)

    def to_dto(self, achievement_id: str, saved: bool) -> dict:
        a = self._by_id[achievement_id]
        return {
            "id": a.id, "name": a.name, "description": a.description,
            "coins": a.coins, "icon": a.icon, "saved": saved,
        }


achievement_catalog = AchievementCatalog()
