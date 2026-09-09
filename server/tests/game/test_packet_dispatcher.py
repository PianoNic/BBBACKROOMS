"""PacketDispatcher routing gate.

The dispatcher checks waiting-room packets first, then gates every in-game
packet on `lobby.status == "running"`, then routes admin-only packets to
their own admin check. This asserts the gate itself rather than every
individual handler, which the other tests in this package already cover.
"""
from __future__ import annotations

from app.application.dtos.packets import LobbySettingsPkt, MovePkt, StartGamePkt
from app.presentation.dependencies import game_core

from ..conftest import add_player, make_lobby


async def test_move_ignored_while_lobby_not_running():
    lobby = make_lobby()
    lobby.status = "waiting"
    me = add_player(lobby, "me", x=0.0, z=0.0)
    pkt = MovePkt(type="move", x=5.0, z=5.0, yaw=0.0)

    await game_core.dispatcher.dispatch(me.channel, lobby, me, pkt)

    assert me.x == 0.0
    assert me.z == 0.0


async def test_lobby_settings_ignored_from_non_admin():
    lobby = make_lobby()
    lobby.status = "waiting"
    admin = add_player(lobby, "admin")
    other = add_player(lobby, "other")
    lobby.admin_id = admin.id
    original_max_players = lobby.max_players
    pkt = LobbySettingsPkt(type="lobby_settings", maxPlayers=99)

    await game_core.dispatcher.dispatch(other.channel, lobby, other, pkt)

    assert lobby.max_players == original_max_players


async def test_start_game_ignored_from_non_admin():
    lobby = make_lobby()
    lobby.status = "waiting"
    admin = add_player(lobby, "admin")
    other = add_player(lobby, "other")
    lobby.admin_id = admin.id
    pkt = StartGamePkt(type="start_game")

    await game_core.dispatcher.dispatch(other.channel, lobby, other, pkt)

    assert lobby.status == "waiting"
