"""Broadcast the win/lose result with per-player rewards, persisting XP/coins
for signed-in players.

The shared scoreboard is built once; each connection is sent its OWN copy with
its `selfRewards` block. For players linked to an account (and when the DB is
up) the round's XP/coins are written and the level-up reflects their real
stored level; guests see the same numbers with `saved=false`.

`rewards_applied` guards against crediting an account twice if the end-of-round
path fires more than once.
"""
from __future__ import annotations

import logging

from app.db import accounts_repo
from app.db.engine import db_available
from app.domain.lobby import Lobby
from app.services._helpers import send_safe
from app.services.leveling import level_from_total
from app.services.scoreboard import build_scoreboard, compute_rewards

log = logging.getLogger("bbb")


async def _persist_rewards(lobby: Lobby, rewards: dict[str, dict]) -> None:
    """For each signed-in player, credit xp/coins and rewrite their reward block
    to reflect their true before/after level. Best-effort: a DB hiccup leaves
    that player as an unsaved guest-style result and never blocks the broadcast.
    """
    if not db_available():
        return
    for p in lobby.conns.values():
        if p.account_id is None:
            continue
        r = rewards.get(p.id)
        if r is None:
            continue
        try:
            xp_before, xp_after, _coins_after = await accounts_repo.apply_round_rewards(
                p.account_id, r["xpEarned"], r["coinsEarned"],
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("reward persist failed for %s: %s", p.id, exc)
            continue
        level_before, _, _ = level_from_total(xp_before)
        level_after, xp_into, xp_for_next = level_from_total(xp_after)
        r.update({
            "levelBefore": level_before,
            "levelAfter": level_after,
            "xpIntoLevel": xp_into,
            "xpForNextLevel": xp_for_next,
            "leveledUp": level_after > level_before,
            "saved": True,
        })


async def _send_each(lobby: Lobby, result: str, shared: dict) -> None:
    pkt_type = f"game_{result}"
    for p in lobby.conns.values():
        await send_safe(p, {
            "type": pkt_type,
            "scoreboard": {**shared, "selfRewards": lobby.round_rewards.get(p.id)},
        })


async def broadcast_endgame(lobby: Lobby, result: str) -> None:
    """Send `game_won`/`game_lost` per-player with rewards. `result` is
    "won"/"lost"; the packet type is `game_<result>`."""
    shared = build_scoreboard(lobby, result)

    # Already finalized this round (e.g. win detected on two paths): re-send the
    # cached rewards without crediting accounts again.
    if lobby.rewards_applied:
        await _send_each(lobby, result, shared)
        return

    rewards = compute_rewards(lobby, result)
    await _persist_rewards(lobby, rewards)
    lobby.round_rewards = rewards
    lobby.rewards_applied = True
    await _send_each(lobby, result, shared)
