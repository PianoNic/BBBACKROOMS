"""End-of-round scoreboard: per-player + team stats for the victory/defeat UI.

Pure read of `PlayerConn` round counters + the dead/extracted sets. Carries
player names itself because they are not otherwise shipped into the world
(world_init only sends id/color/pose). No service imports, so it is safe to
call from quests/teacher_loop/lobby_service without circular-import risk."""
from __future__ import annotations

import time as _time

from app.domain.lobby import Lobby


def build_scoreboard(lobby: Lobby, result: str) -> dict:
    """Snapshot every player's round stats. `result` is "won" or "lost".

    Stamps `round_ended_at` once so survival times for players who neither
    died nor extracted are anchored to the end of the round rather than the
    live clock."""
    if lobby.round_ended_at <= 0.0:
        lobby.round_ended_at = _time.monotonic()
    end = lobby.round_ended_at
    start = lobby.round_started_at or end

    players: list[dict] = []
    team = {
        "tasks": 0, "stuns": 0, "revives": 0, "items": 0,
        "extracted": 0, "died": 0, "total": 0,
    }
    for p in lobby.conns.values():
        died = p.id in lobby.dead
        extracted = p.id in lobby.extracted
        if died and p.death_t > 0.0:
            survival = p.death_t - start
        elif extracted and p.extracted_t > 0.0:
            survival = p.extracted_t - start
        else:
            survival = end - start
        players.append({
            "id": p.id, "name": p.name, "color": p.color,
            "tasks": p.tasks_done, "stuns": p.teachers_stunned,
            "revives": p.revives_done, "items": p.items_collected,
            "survivalMs": max(0, int(survival * 1000)),
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
