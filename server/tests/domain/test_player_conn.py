from __future__ import annotations

import pytest

from app.domain.lobbies.player_channel import IPlayerChannel
from app.domain.lobbies.player_conn import PlayerConn


class _StubChannel(IPlayerChannel):
    async def send_json(self, payload: dict) -> None:
        pass

    async def send_text(self, payload: str) -> None:
        pass


def _make() -> PlayerConn:
    return PlayerConn(id="p1", name="p1", color="#ffffff", channel=_StubChannel())


def test_guest_account_id_defaults_to_none():
    assert _make().account_id is None


def test_ready_defaults_to_false():
    assert _make().ready is False


def test_counters_default_to_zero():
    p = _make()
    assert p.tasks_done == 0
    assert p.teachers_stunned == 0
    assert p.revives_done == 0
    assert p.items_collected == 0
    assert p.medkits == 0
    assert p.potions == 0
    assert p.compasses == 0
    assert p.trackers == 0
    assert p.goggles == 0
    assert p.gps == 0


def test_i_player_channel_cannot_be_instantiated_directly():
    with pytest.raises(TypeError):
        IPlayerChannel()
