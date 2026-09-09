"""Broadcast fan-out (issues #39, #40)."""
from __future__ import annotations

import json

from app.game.broadcaster import Broadcaster

from ..conftest import add_player, make_lobby


class TestSingleEncode:
    """#39 — one serialisation per broadcast, not one per recipient."""

    async def test_every_recipient_gets_the_same_payload_bytes(self):
        lobby = make_lobby()
        players = [add_player(lobby, f"p{i}") for i in range(5)]
        broadcaster = Broadcaster()

        await broadcaster.broadcast(lobby, {"type": "ping", "n": 1})

        payloads = {p.channel.text_sent[0] for p in players}
        assert len(payloads) == 1, "recipients got separately encoded payloads"
        assert json.loads(payloads.pop()) == {"type": "ping", "n": 1}
        # send_json would re-run json.dumps per recipient; send_text does not.
        assert all(p.channel.json_sent == [] for p in players)

    async def test_exclude_skips_that_conn(self):
        lobby = make_lobby()
        a = add_player(lobby, "a")
        b = add_player(lobby, "b")
        broadcaster = Broadcaster()

        await broadcaster.broadcast(lobby, {"type": "ping"}, exclude="a")

        assert a.channel.text_sent == []
        assert len(b.channel.text_sent) == 1

    async def test_a_dead_socket_does_not_stop_the_others(self):
        lobby = make_lobby()
        good = add_player(lobby, "good")
        dead = add_player(lobby, "dead")
        broadcaster = Broadcaster()

        async def boom(_payload):
            raise ConnectionResetError("client vanished")

        dead.channel.send_text = boom

        await broadcaster.broadcast(lobby, {"type": "ping"})

        assert len(good.channel.text_sent) == 1


class TestReadyGate:
    """#40 — nothing reaches a conn before its own lobby_state."""

    async def test_conn_is_skipped_until_ready(self):
        lobby = make_lobby()
        joining = add_player(lobby, "joining")
        joining.ready = False   # registered in conns, self-send still in flight
        settled = add_player(lobby, "settled")
        broadcaster = Broadcaster()

        await broadcaster.broadcast(lobby, {"type": "lobby_player_join", "id": "joining"})

        # The client drops everything received before lobby_state, so an early
        # join packet would be lost and that player missing from the roster.
        assert joining.channel.text_sent == []
        assert len(settled.channel.text_sent) == 1

    async def test_conn_receives_once_ready(self):
        lobby = make_lobby()
        p = add_player(lobby, "p")
        p.ready = False
        broadcaster = Broadcaster()
        await broadcaster.broadcast(lobby, {"type": "a"})
        p.ready = True
        await broadcaster.broadcast(lobby, {"type": "b"})

        assert [json.loads(t)["type"] for t in p.channel.text_sent] == ["b"]
