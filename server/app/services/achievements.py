"""Round-end achievement evaluation from `PlayerConn` counters.

Pure function of lobby + player state — persistence and coin payouts live
in `endgame.py` / `db/achievements_repo.py`.
"""
from __future__ import annotations

from app.domain.lobby import Lobby, PlayerConn

SPEEDRUN_MS = 5 * 60 * 1000


def evaluate_round(
    lobby: Lobby, result: str, p: PlayerConn, duration_ms: int,
) -> list[str]:
    """All achievement ids this player earned this round (unlock filtering
    against already-owned achievements happens at the repo layer)."""
    won = result == "won"
    died = p.id in lobby.dead
    extracted = p.id in lobby.extracted
    nobody_died = all(pid not in lobby.dead for pid in lobby.conns)

    out = ["ach_erste_schicht"]
    if extracted:
        out.append("ach_houdini")
    if not died:
        out.append("ach_survivor")
    if p.items_collected >= 5:
        out.append("ach_sammler")
    if p.revives_done >= 3:
        out.append("ach_medic")
    if p.tasks_done >= 5:
        out.append("ach_streber")
    if p.teachers_stunned >= 3:
        out.append("ach_stuhlgewitter")
    if won and duration_ms < SPEEDRUN_MS:
        out.append("ach_speedrun")
    if won and nobody_died:
        out.append("ach_klassenerhalt")
    return out
