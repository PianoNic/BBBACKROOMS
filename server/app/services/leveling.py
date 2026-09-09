"""Pure XP / level / coin math for the end-of-round rewards.

No I/O and no app imports on purpose (same discipline as scoreboard.py) so it
can be called from the scoreboard/endgame path without circular-import risk and
unit-tested in isolation. Tuning lives here so the economy is tweakable in one
place.
"""
from __future__ import annotations

from app.domain.progression.level_calculator import LevelCalculator

# --- XP earn rates (per round, per player) --------------------------------
XP_TASK = 25            # per objective spot completed — the core driver
XP_REVIVE = 40          # per teammate revived — highest per-action (teamwork)
XP_ITEM = 8             # per pickup collected
XP_STUN = 15            # per teacher stunned (chair hit)
STUN_CAP = 10           # only the first N stuns earn XP (anti stun-lock farm)
XP_EXTRACT = 100        # flat bonus for escaping
XP_WIN_BONUS = 75       # flat bonus to everyone still connected on a team win
XP_FLOOR = 20           # participation floor so a present player always gains

# Survival: 1 XP per SURVIVAL_UNIT_S survived, capped (anti AFK-survive farm).
SURVIVAL_UNIT_S = 6
SURVIVAL_XP_CAP = 60

# Trivially short rounds earn a fraction, to stop start->instant-extract farming.
SHORT_ROUND_MS = 30_000
SHORT_ROUND_SCALE = 0.25

# --- Coins ----------------------------------------------------------------
COIN_RATE = 0.10        # coins = round(xp * COIN_RATE) + win bonus
COIN_WIN_BONUS = 25


_levels = LevelCalculator()


def xp_total_for_level(level: int) -> int:
    """Cumulative XP required to *reach* the given level (level 1 == 0 XP).

    xp_total(L) = 50 * (L-1) * L, so the step L -> L+1 costs 100 * L."""
    return _levels.xp_total_for_level(level)


def level_from_total(total_xp: int) -> tuple[int, int, int]:
    """Map a cumulative XP total to (level, xp_into_level, xp_for_next_level)."""
    return _levels.level_from_total(total_xp)


def survival_xp(survival_ms: int) -> int:
    return min(int(survival_ms // 1000 // SURVIVAL_UNIT_S), SURVIVAL_XP_CAP)


def earned_xp(
    *, tasks: int, revives: int, items: int, stuns: int,
    extracted: bool, survival_ms: int, won: bool, duration_ms: int,
) -> int:
    """Total XP a player earned this round, before any account total."""
    xp = (
        tasks * XP_TASK
        + revives * XP_REVIVE
        + items * XP_ITEM
        + min(stuns, STUN_CAP) * XP_STUN
        + survival_xp(survival_ms)
    )
    if extracted:
        xp += XP_EXTRACT
    if won:
        xp += XP_WIN_BONUS
    xp = max(xp, XP_FLOOR)
    if duration_ms < SHORT_ROUND_MS:
        xp = round(xp * SHORT_ROUND_SCALE)
    return xp


def earned_coins(xp: int, won: bool) -> int:
    return round(xp * COIN_RATE) + (COIN_WIN_BONUS if won else 0)
