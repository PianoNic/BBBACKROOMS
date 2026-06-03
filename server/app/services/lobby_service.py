"""Lobby lifecycle: starting the game, building outbound state DTOs.

The store (`app.domain.lobby_store`) owns create/get/delete; this module
handles "moving the lobby into running" and serialising its state for the
client. Pure async functions, no FastAPI dependency."""
from __future__ import annotations

import math
import random
import secrets
import time as _time

from app.domain.lobby import GAMES, Chair, Door, Laptop, Lobby, Locker, PlayerConn
from app.services.laptop_challenges import make_challenge
from app.world.generator import generate
from app.world.pickups import fill_lockers
from app.world.teachers import spawn_teachers, to_dto


# Seconds of safety after game start so the slot-machine reveal can play out
# without players being caught or stunned mid-modal.
START_GRACE_S = 12.0


def start_lobby(lobby: Lobby) -> None:
    """Generate the world, spawn teachers/laptops, and flip to running."""
    if lobby.status != "waiting":
        return
    size = lobby.map_size
    seed = lobby.map_seed if lobby.map_seed is not None else random.randrange(2**31)
    lobby.last_seed = seed
    world, layout = generate(
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
                challenge=make_challenge(game, rng),
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
    for obj in world.objectives:
        if obj.kind == "casino":
            for s, laptop in zip(obj.spots, lobby.laptops.values()):
                s.tag = laptop.id
    lobby.teachers = spawn_teachers(
        world.grid.cells,
        selected_images=lobby.selected_teacher_images,
        width=world.grid.width, height=world.grid.height,
        avoid_x=world.spawn.x, avoid_z=world.spawn.z,
        atrium=layout.atrium,
    )
    world.teachers = [to_dto(t) for t in lobby.teachers]
    fill_lockers(list(lobby.lockers.values()), world.grid.width, random.Random())
    lobby.world = world
    spawn = world.spawn
    for p in lobby.conns.values():
        p.x, p.z, p.yaw = spawn.x, spawn.z, spawn.yaw
    lobby.status = "running"
    lobby.had_game = True
    lobby.grace_until = _time.monotonic() + START_GRACE_S


def lobby_room_state(lobby: Lobby, self_id: str) -> dict:
    """Snapshot of a lobby's waiting room for a freshly connected player."""
    from app.world.teachers import TEACHER_ROSTER
    return {
        "type": "lobby_state",
        "id": lobby.id,
        "name": lobby.name,
        "status": lobby.status,
        "maxPlayers": lobby.max_players,
        "hasPassword": lobby.password is not None,
        "adminId": lobby.admin_id,
        "selfId": self_id,
        "selectedTeachers": lobby.selected_teacher_images,
        "mapSize": lobby.map_size,
        "mapSeed": lobby.map_seed,
        "objectiveCount": lobby.objective_count,
        "roster": [
            {"image": img, "name": name, "subject": subj, "ability": ab}
            for (img, name, subj, ab) in TEACHER_ROSTER
        ],
        "players": [
            {"id": p.id, "name": p.name, "color": p.color, "avatar": p.avatar}
            for p in lobby.conns.values()
        ],
        "chat": [
            {"id": m.id, "author": m.author, "text": m.text, "ts": m.ts}
            for m in lobby.chat
        ],
    }


def _laptop_done_status(lobby: Lobby, laptop_id: str) -> bool:
    assert lobby.world is not None
    for obj in lobby.world.objectives:
        if obj.kind != "casino":
            continue
        for s in obj.spots:
            if s.tag == laptop_id:
                return s.done
    return False


def world_init_payload(lobby: Lobby, me: PlayerConn) -> dict:
    """Per-player WORLD_INIT snapshot sent on game start."""
    assert lobby.world is not None
    init_payload = lobby.world.model_dump()
    init_payload["selfId"] = me.id
    init_payload["selfColor"] = me.color
    init_payload["players"] = [
        {"id": p.id, "color": p.color, "x": p.x, "z": p.z, "yaw": p.yaw, "avatar": p.avatar}
        for p in lobby.conns.values() if p.id != me.id
    ]
    init_payload["phase"] = lobby.phase
    init_payload["extractedPlayers"] = list(lobby.extracted)
    init_payload["deadPlayers"] = list(lobby.dead)
    init_payload["laptops"] = [
        {
            "id": lp.id, "x": lp.x, "z": lp.z, "yaw": lp.yaw,
            "game": lp.game, "done": _laptop_done_status(lobby, lp.id),
        }
        for lp in lobby.laptops.values()
    ]
    init_payload["props"] = [
        p for p in init_payload["props"]
        if p["type"] not in ("laptop", "chair", "locker")
    ]
    init_payload["lockers"] = [
        {"id": lk.id, "x": lk.x, "z": lk.z, "yaw": lk.yaw,
         "opened": lk.opened, "has_item": False}
        for lk in lobby.lockers.values()
    ]
    init_payload["chairs"] = [
        {
            "id": c.id, "x": c.x, "z": c.z, "yaw": c.yaw,
            "heldBy": c.held_by,
        }
        for c in lobby.chairs.values()
    ]
    init_payload["pickups"] = [
        {"id": pk.id, "kind": pk.kind, "x": pk.x, "z": pk.z}
        for pk in lobby.pickups.values()
    ]
    init_payload["corpses"] = [
        {"id": pid, "x": x, "z": z} for pid, (x, z) in lobby.corpses.items()
    ]
    init_payload["doors"] = [
        {"id": d.id, "x": d.x, "z": d.z, "yaw": d.yaw_closed, "isOpen": d.is_open}
        for d in lobby.doors_state.values()
    ]
    init_payload["inventory"] = {
        "medkits": me.medkits, "potions": me.potions,
        "compasses": me.compasses, "trackers": me.trackers,
        "goggles": me.goggles, "gps": me.gps,
    }
    return init_payload
