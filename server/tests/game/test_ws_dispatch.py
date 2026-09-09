"""Dispatcher structure (issue #37).

A behavioural test would need one crafted packet per branch; what actually
regressed was structural — two branches handled their packet and then fell
through into the remaining `isinstance` checks. Asserting on the AST catches
that for every branch at once, including ones added later.
"""
from __future__ import annotations

import ast
import pathlib

import pytest
from pydantic import ValidationError

from app.application.dtos.packets import ClientPacketAdapter, PackAnnouncePkt
from app.game.lobby_state_builder import LobbyStateBuilder
from app.presentation.dependencies import game_core
from app.presentation.websocket import game_web_socket_endpoint as ws

from ..conftest import add_player, make_lobby

DISPATCH = pathlib.Path(__file__).resolve().parents[2] / "app" / "game" / "packet_dispatcher.py"
WS_MODULE = (
    pathlib.Path(__file__).resolve().parents[2]
    / "app" / "presentation" / "websocket" / "game_web_socket_endpoint.py"
)


def _packet_branches() -> list[ast.If]:
    tree = ast.parse(DISPATCH.read_text(encoding="utf-8"))
    fn = next(
        n for n in ast.walk(tree)
        if isinstance(n, ast.AsyncFunctionDef) and n.name == "dispatch"
    )
    # Top-level branches that test the packet, i.e. the routing table itself.
    return [
        node for node in fn.body
        if isinstance(node, ast.If) and "pkt" in ast.unparse(node.test) and node.body
    ]


def test_every_packet_branch_ends_in_return():
    offenders = [
        f"line {node.lineno}: {ast.unparse(node.test)}"
        for node in _packet_branches()
        if not isinstance(node.body[-1], ast.Return)
    ]
    assert not offenders, (
        "dispatch branches fall through into later isinstance checks:\n  "
        + "\n  ".join(offenders)
    )


def test_the_routing_table_is_not_empty():
    # Guards the test above against silently passing if `dispatch` is renamed
    # or restructured into something this parser no longer recognises.
    assert len(_packet_branches()) > 10


def test_pack_announce_rejects_extra_field():
    with pytest.raises(ValidationError):
        ClientPacketAdapter.validate_python({
            "type": "pack_announce", "pack_id": "foo-pack",
            "pack_hash": "a" * 64, "data": "unexpected",
        })


def test_pack_announce_rejects_oversized_pack_id():
    with pytest.raises(ValidationError):
        ClientPacketAdapter.validate_python({
            "type": "pack_announce", "pack_id": "a" * 200, "pack_hash": "a" * 64,
        })


def test_pack_announce_rejects_invalid_pack_hash():
    with pytest.raises(ValidationError):
        ClientPacketAdapter.validate_python({
            "type": "pack_announce", "pack_id": "foo-pack", "pack_hash": "not-hex",
        })


def test_pack_announce_validates():
    pkt = ClientPacketAdapter.validate_python({
        "type": "pack_announce", "pack_id": "foo-pack", "pack_hash": "a" * 64,
    })
    assert isinstance(pkt, PackAnnouncePkt)
    assert pkt.pack_id == "foo-pack"
    assert pkt.pack_hash == "a" * 64


async def test_pack_announce_ignored_from_non_host():
    lobby = make_lobby()
    host = add_player(lobby, "host")
    other = add_player(lobby, "other")
    lobby.admin_id = host.id
    pkt = PackAnnouncePkt(type="pack_announce", pack_id="foo-pack", pack_hash="a" * 64)

    await game_core.dispatcher.dispatch(other.channel, lobby, other, pkt)

    assert lobby.pack_id is None
    assert lobby.pack_hash is None


async def test_pack_announce_from_host_updates_lobby_and_room_state():
    lobby = make_lobby()
    host = add_player(lobby, "host")
    lobby.admin_id = host.id
    pkt = PackAnnouncePkt(type="pack_announce", pack_id="foo-pack", pack_hash="b" * 64)

    await game_core.dispatcher.dispatch(host.channel, lobby, host, pkt)

    assert lobby.pack_id == "foo-pack"
    assert lobby.pack_hash == "b" * 64
    state = LobbyStateBuilder().build(lobby, host.id)
    assert state["packId"] == "foo-pack"
    assert state["packHash"] == "b" * 64


def test_oversized_frame_exceeds_the_guard_constant():
    assert len("x" * 100_000) > ws.MAX_WS_MESSAGE_BYTES


def test_ws_receive_loop_guards_message_size_before_parsing():
    tree = ast.parse(WS_MODULE.read_text(encoding="utf-8"))
    fn = next(
        n for n in ast.walk(tree)
        if isinstance(n, ast.AsyncFunctionDef) and n.name == "ws_endpoint"
    )
    while_node = next(n for n in ast.walk(fn) if isinstance(n, ast.While))
    body = while_node.body
    receive_idx = next(
        i for i, node in enumerate(body) if "receive_text" in ast.unparse(node)
    )
    guard = body[receive_idx + 1]
    assert isinstance(guard, ast.If)
    assert "MAX_WS_MESSAGE_BYTES" in ast.unparse(guard.test)
    assert "len" in ast.unparse(guard.test)
    assert any(isinstance(s, ast.Continue) for s in guard.body)
    rest = ast.unparse(body[receive_idx + 2:])
    assert "json.loads" in rest
