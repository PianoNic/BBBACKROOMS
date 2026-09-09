from __future__ import annotations

import asyncio
import math
import random
import secrets
import time as _time
from collections.abc import Callable
from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.domain.lobbies.chair import Chair
from app.domain.lobbies.door import Door
from app.domain.lobbies.hideout import Hideout
from app.domain.lobbies.laptop import Laptop
from app.domain.lobbies.lobby import GAMES, Lobby
from app.domain.lobbies.locker import Locker
from app.domain.world.challenges.laptop_challenge_factory import LaptopChallengeFactory
from app.domain.world.teachers import TeacherState, to_dto

# Seconds of safety after game start so the slot-machine reveal can play out
# without players being caught or stunned mid-modal.
START_GRACE_S = 12.0


@dataclass
class StartGameCommand(ICommand[None]):
    lobby: Lobby


class StartGameHandler(ICommandHandler[StartGameCommand, None]):
    def __init__(
        self,
        generator: Callable[..., tuple[object, object]],
        teacher_spawner: Callable[..., list[TeacherState]],
        locker_filler: Callable[..., None],
        challenge_factory: LaptopChallengeFactory,
    ) -> None:
        self._generator = generator
        self._teacher_spawner = teacher_spawner
        self._locker_filler = locker_filler
        self._challenge_factory = challenge_factory

    async def handle(self, command: StartGameCommand) -> None:
        await asyncio.to_thread(self._start_lobby, command.lobby)

    def _start_lobby(self, lobby: Lobby) -> None:
        """Generate the world, spawn teachers/laptops, and flip to running."""
        if lobby.status != "waiting":
            return
        size = lobby.map_size
        seed = lobby.map_seed if lobby.map_seed is not None else random.randrange(2**31)
        lobby.last_seed = seed
        world, layout = self._generator(
            seed=seed, width=size, height=size,
            objective_count=lobby.objective_count,
        )
        lobby.hallway_rects = [h for h in layout.hallways if h is not layout.atrium]
        lobby.doors = list(layout.doors)
        # Spawn an interactable Door panel on every classroom doorway. Other
        # archetypes stay open (no door panel) so the cafeteria/gym/toilets
        # don't get wall-blocking visuals that aren't part of the design.
        for room in layout.rooms:
            if room.archetype != "classroom":
                continue
            # The closed-state yaw is parallel to the wall the door sits on:
            # N/S walls run E-W (yaw=0); E/W walls run N-S (yaw=π/2).
            yaw_closed = 0.0 if room.front_dir in ("N", "S") else math.pi / 2
            did = secrets.token_hex(3)
            lobby.doors_state[did] = Door(
                id=did, x=room.door_x, z=room.door_z, yaw_closed=yaw_closed,
            )
        rng = random.Random()
        for p in world.props:
            if p.type == "laptop":
                laptop_id = secrets.token_hex(3)
                game = rng.choice(GAMES)
                lobby.laptops[laptop_id] = Laptop(
                    id=laptop_id, x=p.x, z=p.z, yaw=p.yaw, game=game,
                    challenge=self._challenge_factory.make_challenge(game, rng),
                )
            elif p.type == "chair":
                cid = secrets.token_hex(3)
                lobby.chairs[cid] = Chair(
                    id=cid,
                    home_x=p.x, home_z=p.z, home_yaw=p.yaw,
                    x=p.x, z=p.z, yaw=p.yaw,
                )
            elif p.type == "locker":
                lid = secrets.token_hex(3)
                lobby.lockers[lid] = Locker(id=lid, x=p.x, z=p.z, yaw=p.yaw)
            elif p.type == "closet":
                hid = secrets.token_hex(3)
                lobby.hideouts[hid] = Hideout(id=hid, x=p.x, z=p.z, yaw=p.yaw)
        for obj in world.objectives:
            if obj.kind == "casino":
                for s, laptop in zip(obj.spots, lobby.laptops.values()):
                    s.tag = laptop.id
        lobby.teachers = self._teacher_spawner(
            world.grid.cells,
            selected_images=lobby.selected_teacher_images,
            width=world.grid.width, height=world.grid.height,
            avoid_x=world.spawn.x, avoid_z=world.spawn.z,
            atrium=layout.atrium,
        )
        world.teachers = [to_dto(t) for t in lobby.teachers]
        self._locker_filler(list(lobby.lockers.values()), world.grid.width, random.Random())
        lobby.world = world
        spawn = world.spawn
        for p in lobby.conns.values():
            p.x, p.z, p.yaw = spawn.x, spawn.z, spawn.yaw
        lobby.status = "running"
        lobby.had_game = True
        lobby.grace_until = _time.monotonic() + START_GRACE_S
        lobby.round_started_at = _time.monotonic()
        lobby.round_ended_at = 0.0
