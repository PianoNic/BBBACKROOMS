from app.domain.progression.reward_calculator import (
    COIN_WIN_BONUS,
    RewardCalculator,
    SHORT_ROUND_MS,
    SURVIVAL_XP_CAP,
    XP_EXTRACT,
    XP_FLOOR,
    XP_WIN_BONUS,
)


def test_survival_xp_scales_with_time_and_caps():
    calc = RewardCalculator()
    assert calc.survival_xp(0) == 0
    assert calc.survival_xp(6_000) == 1
    assert calc.survival_xp(1_000_000) == SURVIVAL_XP_CAP


def test_earned_xp_zero_activity_hits_the_participation_floor():
    calc = RewardCalculator()
    xp = calc.earned_xp(
        tasks=0, revives=0, items=0, stuns=0, extracted=False,
        survival_ms=0, won=False, duration_ms=SHORT_ROUND_MS,
    )
    assert xp == XP_FLOOR


def test_earned_xp_adds_extract_and_win_bonus():
    calc = RewardCalculator()
    # A non-zero task count keeps the base above XP_FLOOR so the bonuses stay
    # additive (a floored base would absorb part of the bonus otherwise).
    base = calc.earned_xp(
        tasks=1, revives=0, items=0, stuns=0, extracted=False,
        survival_ms=0, won=False, duration_ms=SHORT_ROUND_MS + 1,
    )
    with_bonuses = calc.earned_xp(
        tasks=1, revives=0, items=0, stuns=0, extracted=True,
        survival_ms=0, won=True, duration_ms=SHORT_ROUND_MS + 1,
    )
    assert with_bonuses == base + XP_EXTRACT + XP_WIN_BONUS


def test_earned_xp_short_round_is_scaled_down():
    calc = RewardCalculator()
    long_round = calc.earned_xp(
        tasks=4, revives=0, items=0, stuns=0, extracted=False,
        survival_ms=0, won=False, duration_ms=SHORT_ROUND_MS,
    )
    short_round = calc.earned_xp(
        tasks=4, revives=0, items=0, stuns=0, extracted=False,
        survival_ms=0, won=False, duration_ms=SHORT_ROUND_MS - 1,
    )
    assert short_round == round(long_round * 0.25)


def test_stuns_are_capped_for_xp_purposes():
    calc = RewardCalculator()
    at_cap = calc.earned_xp(
        tasks=0, revives=0, items=0, stuns=10, extracted=False,
        survival_ms=0, won=False, duration_ms=SHORT_ROUND_MS + 1,
    )
    past_cap = calc.earned_xp(
        tasks=0, revives=0, items=0, stuns=50, extracted=False,
        survival_ms=0, won=False, duration_ms=SHORT_ROUND_MS + 1,
    )
    assert at_cap == past_cap


def test_earned_coins_follows_the_rate_and_win_bonus():
    calc = RewardCalculator()
    assert calc.earned_coins(100, won=False) == 10
    assert calc.earned_coins(100, won=True) == 10 + COIN_WIN_BONUS
