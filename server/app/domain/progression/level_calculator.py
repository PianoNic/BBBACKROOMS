from __future__ import annotations


class LevelCalculator:
    def xp_total_for_level(self, level: int) -> int:
        if level <= 1:
            return 0
        return 50 * (level - 1) * level

    def level_from_total(self, total_xp: int) -> tuple[int, int, int]:
        total = max(0, total_xp)
        level = 1
        while self.xp_total_for_level(level + 1) <= total:
            level += 1
        base = self.xp_total_for_level(level)
        xp_into = total - base
        xp_for_next = self.xp_total_for_level(level + 1) - base
        return level, xp_into, xp_for_next
