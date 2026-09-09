from app.domain.progression.achievement_evaluator import AchievementEvaluator, SPEEDRUN_MS

from ..conftest import add_player, make_lobby


def make_evaluator() -> AchievementEvaluator:
    return AchievementEvaluator()


def test_everyone_earns_the_participation_achievement():
    lobby = make_lobby()
    p = add_player(lobby)
    out = make_evaluator().evaluate_round(lobby, "lost", p, duration_ms=10_000)
    assert "ach_erste_schicht" in out


def test_extraction_earns_houdini():
    lobby = make_lobby()
    p = add_player(lobby)
    lobby.extracted.add(p.id)
    out = make_evaluator().evaluate_round(lobby, "won", p, duration_ms=10_000)
    assert "ach_houdini" in out


def test_dying_denies_survivor_and_klassenerhalt():
    lobby = make_lobby()
    p = add_player(lobby, "p1")
    other = add_player(lobby, "p2")
    lobby.dead.add(other.id)
    out = make_evaluator().evaluate_round(lobby, "won", p, duration_ms=10_000)
    assert "ach_survivor" in out
    assert "ach_klassenerhalt" not in out


def test_klassenerhalt_only_when_nobody_died_and_the_team_won():
    lobby = make_lobby()
    p = add_player(lobby)
    evaluator = make_evaluator()

    lost_out = evaluator.evaluate_round(lobby, "lost", p, duration_ms=10_000)
    assert "ach_klassenerhalt" not in lost_out

    won_out = evaluator.evaluate_round(lobby, "won", p, duration_ms=10_000)
    assert "ach_klassenerhalt" in won_out


def test_item_task_revive_stun_thresholds():
    lobby = make_lobby()
    p = add_player(lobby)
    evaluator = make_evaluator()

    below = evaluator.evaluate_round(lobby, "lost", p, duration_ms=10_000)
    assert "ach_sammler" not in below
    assert "ach_medic" not in below
    assert "ach_streber" not in below
    assert "ach_stuhlgewitter" not in below

    p.items_collected = 5
    p.revives_done = 3
    p.tasks_done = 5
    p.teachers_stunned = 3
    at_threshold = evaluator.evaluate_round(lobby, "lost", p, duration_ms=10_000)
    assert "ach_sammler" in at_threshold
    assert "ach_medic" in at_threshold
    assert "ach_streber" in at_threshold
    assert "ach_stuhlgewitter" in at_threshold


def test_speedrun_only_under_the_time_limit_on_a_win():
    lobby = make_lobby()
    p = add_player(lobby)
    evaluator = make_evaluator()

    too_slow = evaluator.evaluate_round(lobby, "won", p, duration_ms=SPEEDRUN_MS)
    assert "ach_speedrun" not in too_slow

    fast_enough = evaluator.evaluate_round(lobby, "won", p, duration_ms=SPEEDRUN_MS - 1)
    assert "ach_speedrun" in fast_enough

    fast_but_lost = evaluator.evaluate_round(lobby, "lost", p, duration_ms=SPEEDRUN_MS - 1)
    assert "ach_speedrun" not in fast_but_lost
