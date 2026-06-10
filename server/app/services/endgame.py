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
from app.domain.achievements import CATALOG as ACHIEVEMENT_CATALOG
from app.domain.achievements import to_dto as achievement_dto
from app.domain.lobby import Lobby
from app.services._helpers import send_safe
from app.services.achievements import evaluate_round
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


async def _apply_achievements(
    lobby: Lobby, result: str, rewards: dict[str, dict], duration_ms: int,
) -> None:
    """Attach earned achievements to each player's reward block. Signed-in
    players only see NEW unlocks and get their coin bonus credited once;
    guests see everything they earned this round, unsaved and coinless."""
    for p in lobby.conns.values():
        r = rewards.get(p.id)
        if r is None:
            continue
        earned = evaluate_round(lobby, result, p, duration_ms)
        if p.account_id is not None and db_available():
            try:
                from app.db import achievements_repo
                new_ids = await achievements_repo.unlock_new(p.account_id, earned)
                bonus = sum(ACHIEVEMENT_CATALOG[aid].coins for aid in new_ids)
                if bonus:
                    await accounts_repo.apply_round_rewards(p.account_id, 0, bonus)
                r["achievements"] = [achievement_dto(aid, True) for aid in new_ids]
                continue
            except Exception as exc:  # noqa: BLE001
                log.warning("achievement persist failed for %s: %s", p.id, exc)
        r["achievements"] = [achievement_dto(aid, False) for aid in earned]


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
    await _apply_achievements(lobby, result, rewards, shared["durationMs"])
    lobby.round_rewards = rewards
    lobby.rewards_applied = True
    await _send_each(lobby, result, shared)
