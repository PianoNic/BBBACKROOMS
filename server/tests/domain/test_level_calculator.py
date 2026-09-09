from app.domain.progression.level_calculator import LevelCalculator


def test_xp_total_for_level_is_zero_at_or_below_one():
    calc = LevelCalculator()
    assert calc.xp_total_for_level(0) == 0
    assert calc.xp_total_for_level(1) == 0


def test_xp_total_for_level_matches_formula():
    calc = LevelCalculator()
    assert calc.xp_total_for_level(2) == 100
    assert calc.xp_total_for_level(5) == 50 * 4 * 5


def test_level_from_total_at_zero():
    calc = LevelCalculator()
    assert calc.level_from_total(0) == (1, 0, 100)


def test_level_from_total_mid_value():
    calc = LevelCalculator()
    level, xp_into, xp_for_next = calc.level_from_total(250)
    assert (level, xp_into, xp_for_next) == (2, 150, 200)
    assert xp_for_next == 100 * level
