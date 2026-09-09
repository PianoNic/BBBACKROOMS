import time

from app.domain.progression.level_calculator import LevelCalculator
from app.domain.progression.reward_calculator import RewardCalculator
from app.domain.progression.scoreboard_builder import ScoreboardBuilder

from ..conftest import add_player, make_lobby


def make_builder() -> ScoreboardBuilder:
    return ScoreboardBuilder(RewardCalculator(), LevelCalculator())


def test_build_reports_per_player_and_team_stats_for_a_mixed_round():
    lobby = make_lobby()
    start = time.monotonic()
    lobby.round_started_at = start
    survivor = add_player(lobby, "survivor")
    survivor.tasks_done = 3
    survivor.items_collected = 2
    victim = add_player(lobby, "victim")
    lobby.extracted.add("survivor")
    survivor.extracted_t = start + 10.0
    lobby.dead.add("victim")
    victim.death_t = start + 5.0

    builder = make_builder()
    board = builder.build(lobby, "won")

    assert board["result"] == "won"
    by_id = {p["id"]: p for p in board["players"]}
    assert by_id["survivor"]["extracted"] is True
    assert by_id["survivor"]["died"] is False
    assert by_id["survivor"]["survivalMs"] == 10_000
    assert by_id["victim"]["extracted"] is False
    assert by_id["victim"]["died"] is True
    assert by_id["victim"]["survivalMs"] == 5_000
    assert board["team"]["extracted"] == 1
    assert board["team"]["died"] == 1
    assert board["team"]["total"] == 2
    assert board["team"]["tasks"] == 3
    assert board["team"]["items"] == 2


def test_compute_rewards_marks_a_guest_as_unsaved():
    lobby = make_lobby()
    lobby.round_started_at = time.monotonic()
    add_player(lobby, "guest")

    builder = make_builder()
    rewards = builder.compute_rewards(lobby, "lost")

    assert rewards["guest"]["saved"] is False
    assert rewards["guest"]["xpEarned"] >= 0
    assert rewards["guest"]["levelAfter"] >= rewards["guest"]["levelBefore"]


def test_compute_rewards_gives_the_extracted_player_more_than_the_dead_one():
    lobby = make_lobby()
    start = time.monotonic()
    lobby.round_started_at = start
    survivor = add_player(lobby, "survivor")
    victim = add_player(lobby, "victim")
    lobby.extracted.add("survivor")
    survivor.extracted_t = start + 100.0
    lobby.dead.add("victim")
    victim.death_t = start + 1.0

    builder = make_builder()
    rewards = builder.compute_rewards(lobby, "won")

    assert rewards["survivor"]["xpEarned"] > rewards["victim"]["xpEarned"]
