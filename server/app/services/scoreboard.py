"""End-of-round scoreboard + per-player reward computation.

Pure read of `PlayerConn` round counters + the dead/extracted sets. Carries
player names itself because they are not otherwise shipped into the world
(world_init only sends id/color/pose). No service imports, so it is safe to
call from quests/teacher_loop/endgame without circular-import risk.

`compute_rewards` derives XP/coins/level from the same counters. Stage A treats
everyone as a guest (base totals of 0, `saved=False`); when accounts land the
guest base will be swapped for the player's stored account totals and `saved`
flipped on a successful write.
"""
from __future__ import annotations

import time as _time

from app.domain.lobby import Lobby, PlayerConn
from app.services.leveling import earned_coins, earned_xp, level_from_total


def _ensure_ended(lobby: Lobby) -> tuple[float, float]:
    """Stamp `round_ended_at` once and return (start, end) monotonic seconds."""
    if lobby.round_ended_at <= 0.0:
        lobby.round_ended_at = _time.monotonic()
    end = lobby.round_ended_at
    start = lobby.round_started_at or end
    return start, end


def _survival_seconds(lobby: Lobby, p: PlayerConn, start: float, end: float) -> float:
    """How long the player lasted: to their death, their extraction, or the
    end of the round if they were still standing."""
    if p.id in lobby.dead and p.death_t > 0.0:
        return p.death_t - start
    if p.id in lobby.extracted and p.extracted_t > 0.0:
        return p.extracted_t - start
    return end - start


def build_scoreboard(lobby: Lobby, result: str) -> dict:
    """Shared per-player + team stats. `result` is "won" or "lost"."""
    start, end = _ensure_ended(lobby)

    players: list[dict] = []
    team = {
        "tasks": 0, "stuns": 0, "revives": 0, "items": 0,
        "extracted": 0, "died": 0, "total": 0,
    }
    for p in lobby.conns.values():
        died = p.id in lobby.dead
        extracted = p.id in lobby.extracted
        survival = max(0.0, _survival_seconds(lobby, p, start, end))
        players.append({
            "id": p.id, "name": p.name, "color": p.color,
            "tasks": p.tasks_done, "stuns": p.teachers_stunned,
            "revives": p.revives_done, "items": p.items_collected,
            "survivalMs": int(survival * 1000),
            "extracted": extracted, "died": died,
        })
        team["tasks"] += p.tasks_done
        team["stuns"] += p.teachers_stunned
        team["revives"] += p.revives_done
        team["items"] += p.items_collected
        team["extracted"] += 1 if extracted else 0
        team["died"] += 1 if died else 0
        team["total"] += 1

    return {
        "result": result,
        "durationMs": max(0, int((end - start) * 1000)),
        "players": players,
        "team": team,
    }


def compute_rewards(lobby: Lobby, result: str) -> dict[str, dict]:
    """Per-player `selfRewards` blocks, keyed by conn id. Each block drives the
    level-up / XP-bar / coins animation on that player's scoreboard."""
    start, end = _ensure_ended(lobby)
    duration_ms = max(0, int((end - start) * 1000))
    won = result == "won"

    out: dict[str, dict] = {}
    for p in lobby.conns.values():
        extracted = p.id in lobby.extracted
        survival_ms = int(max(0.0, _survival_seconds(lobby, p, start, end)) * 1000)
        xp = earned_xp(
            tasks=p.tasks_done, revives=p.revives_done, items=p.items_collected,
            stuns=p.teachers_stunned, extracted=extracted,
            survival_ms=survival_ms, won=won, duration_ms=duration_ms,
        )
        coins = earned_coins(xp, won)

        # Stage A: no accounts yet — everyone is a guest, base total 0, not
        # saved. Stage C swaps `before_total` for the stored account XP and
        # flips `saved` after a successful persist.
        before_total = 0
        after_total = before_total + xp
        level_before, _, _ = level_from_total(before_total)
        level_after, xp_into, xp_for_next = level_from_total(after_total)
        out[p.id] = {
            "xpEarned": xp,
            "coinsEarned": coins,
            "levelBefore": level_before,
            "levelAfter": level_after,
            "xpIntoLevel": xp_into,
            "xpForNextLevel": xp_for_next,
            "leveledUp": level_after > level_before,
            "saved": False,
        }
    return out
