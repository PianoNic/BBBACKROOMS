"""Per-lobby teacher AI tick: movement, abilities, catches, win/lose check."""
from __future__ import annotations

import asyncio
import random
import time as _time

from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.lobby_registry import ILobbyRegistry
from app.game.broadcaster import Broadcaster
from app.game.handlers.ability_handler import AbilityHandler
from app.game.handlers.chair_handler import ChairHandler
from app.game.handlers.door_handler import DoorHandler
from app.game.handlers.noise_handler import NoiseHandler
from app.game.handlers.pickup_handler import PickupHandler
from app.game.handlers.revive_handler import ReviveHandler
from app.game.handlers.status_handler import StatusHandler
from app.domain.world.geom import within_radius
from app.domain.world.physics import TEACHER_CATCH_RADIUS, TEACHER_TICK_HZ
from app.domain.world.teachers import collect_events as collect_teacher_events
from app.domain.world.teachers import tick as teachers_tick


class TeacherLoop:
    def __init__(
        self,
        lobby_registry: ILobbyRegistry,
        broadcaster: Broadcaster,
        ability_handler: AbilityHandler,
        chair_handler: ChairHandler,
        door_handler: DoorHandler,
        noise_handler: NoiseHandler,
        pickup_handler: PickupHandler,
        revive_handler: ReviveHandler,
        status_handler: StatusHandler,
    ) -> None:
        self._lobby_registry = lobby_registry
        self._broadcaster = broadcaster
        self._ability_handler = ability_handler
        self._chair_handler = chair_handler
        self._door_handler = door_handler
        self._noise_handler = noise_handler
        self._pickup_handler = pickup_handler
        self._revive_handler = revive_handler
        self._status_handler = status_handler
        self._teacher_tasks: dict[str, asyncio.Task] = {}

    def ensure(self, lobby: Lobby) -> None:
        if lobby.id in self._teacher_tasks:
            return
        self._teacher_tasks[lobby.id] = asyncio.create_task(self._teacher_loop(lobby.id))

    async def _check_catches(self, lobby: Lobby) -> None:
        """Kill any player within a teacher's catch radius."""
        now = _time.monotonic()
        alive = [
            p for p in lobby.conns.values()
            if p.id not in lobby.dead and p.id not in lobby.extracted
            and p.hidden_in is None
        ]
        for p in alive:
            for t in lobby.teachers:
                if t.stun_until > now:
                    continue
                if within_radius(t, p, TEACHER_CATCH_RADIUS):
                    lobby.dead.add(p.id)
                    p.death_t = now
                    lobby.corpses[p.id] = (p.x, p.z)
                    await self._broadcaster.broadcast(lobby, {
                        "type": "player_killed",
                        "id": p.id, "x": p.x, "z": p.z, "by": t.id,
                    })
                    await self._chair_handler.release_chairs_held_by(lobby, p.id)
                    # Cancel any revive that targets this player or was being run by them.
                    await self._revive_handler.cancel_revives_for(lobby, p.id)
                    break

    async def _check_game_over(self, lobby: Lobby) -> bool:
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

    async def _teacher_loop(self, lobby_id: str) -> None:
        dt = 1.0 / TEACHER_TICK_HZ
        rng = random.Random()
        try:
            while True:
                await asyncio.sleep(dt)
                lobby = self._lobby_registry.get(lobby_id)
                if lobby is None or not lobby.conns or lobby.world is None:
                    return  # restarts on next join
                alive = [
                    p for p in lobby.conns.values()
                    if p.id not in lobby.dead and p.id not in lobby.extracted
                    and p.hidden_in is None
                ]
                positions = [(p.x, p.z) for p in alive]
                now = _time.monotonic()
                in_grace = now < lobby.grace_until
                # Freeze teachers during the start-grace window so they can't
                # close distance during the reveal modal and instakill on tick 12.
                if in_grace:
                    lobby.noise_events.clear()
                else:
                    self._noise_handler.assign_noise_to_teachers(lobby, now)
                if not in_grace:
                    teachers_tick(
                        lobby.teachers, lobby.world.grid.cells, lobby.hallway_rects,
                        positions, dt, rng, doors=lobby.doors,
                        width=lobby.world.grid.width, height=lobby.world.grid.height,
                    )
                if not in_grace:
                    self._status_handler.apply_equation_aura(lobby, now)
                    self._status_handler.apply_potion_puddles(lobby, now)
                    events = collect_teacher_events(
                        lobby.teachers,
                        [(p.id, p.x, p.z) for p in alive],
                        dt,
                        lobby.world.grid.cells,
                        width=lobby.world.grid.width,
                        height=lobby.world.grid.height,
                    )
                    if events:
                        await self._ability_handler.apply_ability_events(lobby, events, rng)
                await self._door_handler.maybe_teacher_toggle(lobby, rng)
                await self._status_handler.push_player_status(lobby, now)
                await self._revive_handler.tick_revives(lobby, now, self._pickup_handler.send_inventory)
                await self._chair_handler.tick_projectiles(lobby, dt)
                await self._chair_handler.push_teacher_stuns(lobby, now)
                # Teacher positions ride along on the batched `players_state`
                # snapshot (see game/snapshot_loop.py) — no separate fan-out here.
                if not in_grace:
                    await self._check_catches(lobby)
                if await self._check_game_over(lobby):
                    return
        finally:
            self._teacher_tasks.pop(lobby_id, None)
