"""Hide-in-closet rules (issues #35, #36, #38)."""
from __future__ import annotations

from app.services import hiding
from app.services.back_to_lobby import _reset_runtime_state

from .conftest import add_chair, add_hideout, add_player, make_lobby


class TestRoundReset:
    """#35 — closets are rebuilt from the new world each round."""

    def test_hideouts_are_cleared(self):
        lobby = make_lobby()
        lobby.phase = "lost"
        add_hideout(lobby, "h1", 10.0, 10.0)
        add_hideout(lobby, "h2", 20.0, 20.0)

        _reset_runtime_state(lobby)

        # Left behind, a stale closet would sit at last round's coordinates —
        # and `hide` resolves by proximity, with no closet id to sanity-check.
        assert lobby.hideouts == {}

    def test_hidden_player_is_released(self):
        lobby = make_lobby()
        lobby.phase = "lost"
        p = add_player(lobby)
        add_hideout(lobby, "h1", 10.0, 10.0, occupied_by=p.id)
        p.hidden_in = "h1"

        _reset_runtime_state(lobby)

        # A dangling id would make the next round drop all their move packets.
        assert p.hidden_in is None
        assert lobby.status == "waiting"


class TestClosetChoice:
    """#36 — occupancy beats proximity."""

    async def test_free_closet_wins_over_nearer_occupied_one(self):
        lobby = make_lobby()
        me = add_player(lobby, "me", x=0.0, z=0.0)
        add_player(lobby, "other", x=1.0, z=0.0)
        add_hideout(lobby, "near", 1.0, 0.0, occupied_by="other")
        add_hideout(lobby, "far", 1.8, 0.0)   # still inside HIDE_RADIUS

        await hiding.handle_hide(lobby, me)

        assert me.hidden_in == "far"
        assert lobby.hideouts["far"].occupied_by == "me"

    async def test_denied_when_every_closet_in_range_is_taken(self):
        lobby = make_lobby()
        me = add_player(lobby, "me", x=0.0, z=0.0)
        add_player(lobby, "other", x=1.0, z=0.0)
        add_hideout(lobby, "only", 1.0, 0.0, occupied_by="other")

        await hiding.handle_hide(lobby, me)

        assert me.hidden_in is None
        assert me.channel.json_sent[-1] == {"type": "hide_denied", "reason": "occupied"}

    async def test_nothing_in_range_stays_silent(self):
        lobby = make_lobby()
        me = add_player(lobby, "me", x=0.0, z=0.0)
        add_hideout(lobby, "far", 50.0, 0.0)

        await hiding.handle_hide(lobby, me)

        assert me.hidden_in is None
        assert me.channel.json_sent == []   # no denial banner for an empty press


class TestEnteringWithAChair:
    """#38 — a chair cannot come into the closet."""

    async def test_held_chair_is_dropped_on_entry(self):
        lobby = make_lobby()
        me = add_player(lobby, "me", x=0.0, z=0.0)
        add_chair(lobby, "c1", 0.0, 0.0, held_by="me")
        add_hideout(lobby, "h1", 1.0, 0.0)

        await hiding.handle_hide(lobby, me)

        assert me.hidden_in == "h1"
        # Otherwise it stays invisibly held by someone who can't use it.
        assert lobby.chairs["c1"].held_by is None
