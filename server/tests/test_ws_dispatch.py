"""Dispatcher structure (issue #37).

A behavioural test would need one crafted packet per branch; what actually
regressed was structural — two branches handled their packet and then fell
through into the remaining `isinstance` checks. Asserting on the AST catches
that for every branch at once, including ones added later.
"""
from __future__ import annotations

import ast
import pathlib

DISPATCH = pathlib.Path(__file__).resolve().parents[1] / "app" / "api" / "ws_dispatch.py"


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
