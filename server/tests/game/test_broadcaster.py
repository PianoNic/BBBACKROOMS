from __future__ import annotations

import json

from app.game.broadcaster import Broadcaster

from ..conftest import add_player, make_lobby


class TestBroadcast:
    async def test_reaches_every_ready_connection(self):
        lobby = make_lobby()
        players = [add_player(lobby, f"p{i}") for i in range(3)]
        broadcaster = Broadcaster()

        await broadcaster.broadcast(lobby, {"type": "ping"})

        for p in players:
            assert len(p.channel.text_sent) == 1
            assert json.loads(p.channel.text_sent[0]) == {"type": "ping"}

    async def test_skips_unready_connections(self):
        lobby = make_lobby()
        not_ready = add_player(lobby, "nr")
        not_ready.ready = False
        ready = add_player(lobby, "r")
        broadcaster = Broadcaster()

        await broadcaster.broadcast(lobby, {"type": "ping"})

        assert not_ready.channel.text_sent == []
        assert len(ready.channel.text_sent) == 1

    async def test_exclude_skips_exactly_that_id(self):
        lobby = make_lobby()
        a = add_player(lobby, "a")
        b = add_player(lobby, "b")
        broadcaster = Broadcaster()

        await broadcaster.broadcast(lobby, {"type": "ping"}, exclude="a")

        assert a.channel.text_sent == []
        assert len(b.channel.text_sent) == 1

    async def test_a_raising_send_does_not_stop_the_others(self):
        lobby = make_lobby()
        good = add_player(lobby, "good")
        dead = add_player(lobby, "dead")
        broadcaster = Broadcaster()

        async def boom(_payload):
            raise ConnectionResetError("client vanished")

        dead.channel.send_text = boom

        await broadcaster.broadcast(lobby, {"type": "ping"})

        assert len(good.channel.text_sent) == 1


class TestSendSafe:
    async def test_swallows_a_raising_channel(self):
        lobby = make_lobby()
        p = add_player(lobby, "p")
        broadcaster = Broadcaster()

        async def boom(_pkt):
            raise ConnectionResetError("client vanished")

        p.channel.send_json = boom

        await broadcaster.send_safe(p, {"type": "ping"})

    async def test_delivers_to_a_healthy_channel(self):
        lobby = make_lobby()
        p = add_player(lobby, "p")
        broadcaster = Broadcaster()

        await broadcaster.send_safe(p, {"type": "ping"})

        assert p.channel.json_sent == [{"type": "ping"}]


class TestIsActive:
    def test_active_when_neither_dead_nor_extracted(self):
        lobby = make_lobby()
        p = add_player(lobby, "p")
        broadcaster = Broadcaster()

        assert broadcaster.is_active(lobby, p) is True

    def test_inactive_when_dead(self):
        lobby = make_lobby()
        p = add_player(lobby, "p")
        lobby.dead.add(p.id)
        broadcaster = Broadcaster()

        assert broadcaster.is_active(lobby, p) is False

    def test_inactive_when_extracted(self):
        lobby = make_lobby()
        p = add_player(lobby, "p")
        lobby.extracted.add(p.id)
        broadcaster = Broadcaster()

        assert broadcaster.is_active(lobby, p) is False

    def test_active_while_merely_hidden(self):
        lobby = make_lobby()
        p = add_player(lobby, "p")
        p.hidden_in = "h1"
        broadcaster = Broadcaster()

        assert broadcaster.is_active(lobby, p) is True
