from app.application.commands.back_to_lobby_command import BackToLobbyCommand, BackToLobbyHandler

from ..conftest import add_hideout, add_player, make_lobby


async def test_ignored_while_the_round_is_not_over():
    lobby = make_lobby()
    lobby.phase = "escape"
    me = add_player(lobby)

    did_reset = await BackToLobbyHandler().handle(BackToLobbyCommand(lobby, me))

    assert did_reset is False
    assert lobby.phase == "escape"


async def test_resets_runtime_state_and_returns_to_waiting():
    lobby = make_lobby()
    lobby.phase = "won"
    me = add_player(lobby)
    add_hideout(lobby, "h1", 10.0, 10.0, occupied_by=me.id)
    me.hidden_in = "h1"
    me.tasks_done = 3
    lobby.dead.add("someone")
    lobby.rewards_applied = True
    lobby.round_rewards = {"someone": {"xpEarned": 1}}

    did_reset = await BackToLobbyHandler().handle(BackToLobbyCommand(lobby, me))

    assert did_reset is True
    assert lobby.status == "waiting"
    assert lobby.phase == "tasks"
    assert lobby.hideouts == {}
    assert me.hidden_in is None
    assert me.tasks_done == 0
    assert lobby.dead == set()
    assert lobby.rewards_applied is False
    assert lobby.round_rewards == {}
