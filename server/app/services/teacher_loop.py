"""Per-lobby teacher AI tick: movement, abilities, catches, win/lose check."""
from __future__ import annotations

import asyncio
import random
import time as _time

from app.domain.lobby import Lobby
from app.domain.lobby_store import get_lobby
from app.services.abilities import apply_ability_events
from app.services.broadcast import broadcast
from app.services.chairs import push_teacher_stuns, tick_projectiles
from app.services.doors import maybe_teacher_toggle
from app.services.noise import assign_noise_to_teachers
from app.services.pickups import send_inventory
from app.services.revive import cancel_revives_for, tick_revives
from app.services.status import (
    apply_equation_aura,
    apply_potion_puddles,
    push_player_status,
)
from app.world.geom import within_radius
from app.world.physics import TEACHER_CATCH_RADIUS, TEACHER_TICK_HZ
from app.world.teachers import collect_events as collect_teacher_events
from app.world.teachers import tick as teachers_tick


_teacher_tasks: dict[str, asyncio.Task] = {}


def ensure_teacher_loop(lobby: Lobby) -> None:
    if lobby.id in _teacher_tasks:
        return
    _teacher_tasks[lobby.id] = asyncio.create_task(_teacher_loop(lobby.id))


async def _check_catches(lobby: Lobby) -> None:
    """Kill any player within a teacher's catch radius."""
    now = _time.monotonic()
    alive = [
        p for p in lobby.conns.values()
        if p.id not in lobby.dead and p.id not in lobby.extracted
    ]
    for p in alive:
        for t in lobby.teachers:
            if t.stun_until > now:
                continue
            if within_radius(t, p, TEACHER_CATCH_RADIUS):
                lobby.dead.add(p.id)
                p.death_t = now
                lobby.corpses[p.id] = (p.x, p.z)
                await broadcast(lobby, {
                    "type": "player_killed",
                    "id": p.id, "x": p.x, "z": p.z, "by": t.id,
                })
                from app.services.chairs import release_chairs_held_by
                await release_chairs_held_by(lobby, p.id)
                # Cancel any revive that targets this player or was being run by them.
                await cancel_revives_for(lobby, p.id)
                break


async def _check_game_over(lobby: Lobby) -> bool:
    """Returns True iff the lobby should be torn down (all-lost case)."""
    if not lobby.conns or lobby.phase in ("won", "lost"):
        return False
    all_dead = all(pid in lobby.dead for pid in lobby.conns)
    all_done = all(
        pid in lobby.extracted or pid in lobby.dead for pid in lobby.conns
    )
    from app.services.endgame import broadcast_endgame
    if all_dead:
        lobby.phase = "lost"
        await broadcast_endgame(lobby, "lost")
        # NOTE: lobby is kept alive so players can press "Back to lobby".
        # Stale-cleanup happens on the last conn leaving (handled elsewhere).
        return True
    if lobby.phase == "escape" and all_done:
        lobby.phase = "won"
        await broadcast_endgame(lobby, "won")
    return False


async def _teacher_loop(lobby_id: str) -> None:
    dt = 1.0 / TEACHER_TICK_HZ
    rng = random.Random()
    try:
        while True:
            await asyncio.sleep(dt)
            lobby = get_lobby(lobby_id)
            if lobby is None or not lobby.conns or lobby.world is None:
                return  # restarts on next join
            alive = [
                p for p in lobby.conns.values()
                if p.id not in lobby.dead and p.id not in lobby.extracted
            ]
            positions = [(p.x, p.z) for p in alive]
            now = _time.monotonic()
            in_grace = now < lobby.grace_until
            # Freeze teachers during the start-grace window so they can't
            # close distance during the reveal modal and instakill on tick 12.
            if in_grace:
                lobby.noise_events.clear()
            else:
                assign_noise_to_teachers(lobby, now)
            if not in_grace:
                teachers_tick(
                    lobby.teachers, lobby.world.grid.cells, lobby.hallway_rects,
                    positions, dt, rng, doors=lobby.doors,
                    width=lobby.world.grid.width, height=lobby.world.grid.height,
                )
            if not in_grace:
                apply_equation_aura(lobby, now)
                apply_potion_puddles(lobby, now)
                events = collect_teacher_events(
                    lobby.teachers,
                    [(p.id, p.x, p.z) for p in alive],
                    dt,
                    lobby.world.grid.cells,
                    width=lobby.world.grid.width,
                    height=lobby.world.grid.height,
                )
                if events:
                    await apply_ability_events(lobby, events, rng)
            await maybe_teacher_toggle(lobby, rng)
            await push_player_status(lobby, now)
            await tick_revives(lobby, now, send_inventory)
            await tick_projectiles(lobby, dt)
            await push_teacher_stuns(lobby, now)
            await broadcast(lobby, {
                "type": "teachers_state",
                "teachers": [
                    {"id": t.id, "x": t.x, "z": t.z} for t in lobby.teachers
                ],
            })
            if not in_grace:
                await _check_catches(lobby)
            if await _check_game_over(lobby):
                return
    finally:
        _teacher_tasks.pop(lobby_id, None)
