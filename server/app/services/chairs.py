"""Chair pickup/throw handling + per-tick projectile physics.

Chairs are authoritative on the server. Players send `chair_pickup`,
`chair_throw`, and `chair_drop`; the server validates and broadcasts
`chair_state`/`chair_throw_start`/`chair_hit` packets. Projectiles are
integrated each teacher tick — on impact (wall, teacher, or another
player) the chair lands and the target is stunned."""
from __future__ import annotations

import math
import secrets
import time as _time

from app.domain.lobby import ChairProjectile, Lobby, PlayerConn
from app.services._helpers import is_active
from app.services.broadcast import broadcast
from app.services.noise import CHAIR_THROW_RADIUS, emit_noise
from app.world.constants import CELL_SIZE
from app.world.geom import within_radius, within_radius_xz


PICKUP_RADIUS = 3.0           # m — must be this close to grab
THROW_SPEED = 14.0            # m/s — flat ground-plane velocity
THROW_LIFETIME = 1.6          # s — auto-land if nothing hit
TEACHER_HIT_RADIUS = 0.85     # m
PLAYER_HIT_RADIUS = 0.7       # m
TEACHER_STUN_S = 3.0          # how long a chair-to-the-face stuns a teacher
PLAYER_STUN_S = 1.5           # friendly-fire stun on players


def _chair_state_pkt(lobby: Lobby, chair_id: str) -> dict:
    c = lobby.chairs[chair_id]
    return {
        "type": "chair_state",
        "chairId": c.id,
        "x": c.x, "z": c.z, "yaw": c.yaw,
        "heldBy": c.held_by,
    }


def _player_holding(lobby: Lobby, player_id: str) -> str | None:
    for c in lobby.chairs.values():
        if c.held_by == player_id:
            return c.id
    return None


async def handle_pickup(lobby: Lobby, me: PlayerConn, chair_id: str) -> None:
    if not is_active(lobby, me):
        return
    chair = lobby.chairs.get(chair_id)
    if chair is None or chair.held_by is not None:
        return
    # Don't allow grabbing a second chair.
    if _player_holding(lobby, me.id) is not None:
        return
    if not within_radius(me, chair, PICKUP_RADIUS):
        return
    chair.held_by = me.id
    await broadcast(lobby, _chair_state_pkt(lobby, chair_id))


async def handle_drop(lobby: Lobby, me: PlayerConn) -> None:
    cid = _player_holding(lobby, me.id)
    if cid is None:
        return
    chair = lobby.chairs[cid]
    chair.held_by = None
    chair.x, chair.z = me.x, me.z
    chair.yaw = me.yaw
    await broadcast(lobby, _chair_state_pkt(lobby, cid))


async def handle_throw(
    lobby: Lobby, me: PlayerConn, dir_x: float, dir_z: float,
) -> None:
    cid = _player_holding(lobby, me.id)
    if cid is None:
        return
    chair = lobby.chairs[cid]
    # Normalize direction; default to player's yaw forward if zeroed.
    d = math.hypot(dir_x, dir_z)
    if d < 1e-3:
        dir_x = math.sin(me.yaw)
        dir_z = math.cos(me.yaw)
    else:
        dir_x /= d
        dir_z /= d
    # Detach: chair is now in flight, not "held" and not at rest.
    chair.held_by = None
    chair.x, chair.z = me.x, me.z
    chair.yaw = math.atan2(dir_x, dir_z)
    pid = secrets.token_hex(3)
    lobby.chair_projectiles.append(ChairProjectile(
        id=pid, chair_id=cid, owner_id=me.id,
        x=me.x, z=me.z,
        vx=dir_x * THROW_SPEED, vz=dir_z * THROW_SPEED,
        spawn_t=_time.monotonic(),
    ))
    await broadcast(lobby, {
        "type": "chair_throw_start",
        "id": pid, "chairId": cid, "ownerId": me.id,
        "x": me.x, "z": me.z,
        "vx": dir_x * THROW_SPEED, "vz": dir_z * THROW_SPEED,
    })
    # A flying chair is the loudest thing in the school.
    emit_noise(lobby, me.x, me.z, CHAIR_THROW_RADIUS)


def _cell_blocks(cells: list[int], width: int, height: int, x: float, z: float) -> bool:
    cx = int(x / CELL_SIZE)
    cz = int(z / CELL_SIZE)
    if not (0 <= cx < width and 0 <= cz < height):
        return True
    return cells[cz * width + cx] != 1


async def tick_projectiles(lobby: Lobby, dt: float) -> None:
    """Advance every in-flight chair; resolve hits + landing."""
    if not lobby.chair_projectiles or lobby.world is None:
        return
    cells = lobby.world.grid.cells
    gw, gh = lobby.world.grid.width, lobby.world.grid.height
    now = _time.monotonic()
    alive: list[ChairProjectile] = []
    for proj in lobby.chair_projectiles:
        nx = proj.x + proj.vx * dt
        nz = proj.z + proj.vz * dt
        hit_id: str | None = None
        hit_kind: str | None = None

        # Teacher hits.
        for t in lobby.teachers:
            if within_radius_xz(t.x, t.z, nx, nz, TEACHER_HIT_RADIUS):
                t.stun_until = max(t.stun_until, now + TEACHER_STUN_S)
                owner = lobby.conns.get(proj.owner_id)
                if owner is not None:
                    owner.teachers_stunned += 1
                hit_id, hit_kind = t.id, "teacher"
                break

        # Player friendly-fire (skip the thrower).
        if hit_id is None:
            for p in lobby.conns.values():
                if p.id == proj.owner_id:
                    continue
                if p.id in lobby.dead or p.id in lobby.extracted:
                    continue
                if within_radius_xz(p.x, p.z, nx, nz, PLAYER_HIT_RADIUS):
                    p.stun_until = max(p.stun_until, now + PLAYER_STUN_S)
                    hit_id, hit_kind = p.id, "player"
                    break

        # Wall hit.
        wall = hit_id is None and _cell_blocks(cells, gw, gh, nx, nz)
        timed_out = (now - proj.spawn_t) > THROW_LIFETIME

        if hit_id is not None or wall or timed_out:
            chair = lobby.chairs.get(proj.chair_id)
            if chair is not None:
                # Land where the chair stops, clamped to a walkable cell.
                lx, lz = (proj.x, proj.z) if wall else (nx, nz)
                chair.x, chair.z = lx, lz
                chair.yaw = math.atan2(proj.vx, proj.vz)
                await broadcast(lobby, {
                    "type": "chair_hit",
                    "id": proj.id, "chairId": chair.id,
                    "x": lx, "z": lz,
                    "hitId": hit_id, "hitKind": hit_kind,
                })
                await broadcast(lobby, _chair_state_pkt(lobby, chair.id))
            continue
        proj.x, proj.z = nx, nz
        alive.append(proj)
    lobby.chair_projectiles = alive


async def release_chairs_held_by(lobby: Lobby, player_id: str) -> None:
    """Drop any chair this player was holding (on death/extraction)."""
    for c in lobby.chairs.values():
        if c.held_by != player_id:
            continue
        c.held_by = None
        # Land at the player's last known position.
        p = lobby.conns.get(player_id)
        if p is not None:
            c.x, c.z, c.yaw = p.x, p.z, p.yaw
        await broadcast(lobby, _chair_state_pkt(lobby, c.id))


async def push_teacher_stuns(lobby: Lobby, now: float) -> None:
    """Send each player the current per-teacher stun timer (ms)."""
    payload = [
        {"id": t.id, "ms": max(0, int((t.stun_until - now) * 1000))}
        for t in lobby.teachers
        if t.stun_until > now
    ]
    if not payload:
        return
    await broadcast(lobby, {"type": "teacher_stuns", "teachers": payload})
