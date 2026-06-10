"""Hide-in-closet logic.

Pressing E near a free closet tucks the player inside: their position is
pinned to the closet, teachers neither chase nor catch them, and their
voxel disappears for everyone else. Entering is denied while a teacher
has line of sight within `SEEN_RADIUS` ("they saw you"), and climbing in
or out emits a noise — talking on voice chat while hidden still leaks
noise from the closet, which is exactly the kind of tension we want.
"""
from __future__ import annotations

import math

from app.domain.lobby import Hideout, Lobby, PlayerConn
from app.services._helpers import is_active, send_safe
from app.services.broadcast import broadcast
from app.services.noise import emit_noise
from app.world.constants import CELL_SIZE
from app.world.geom import distance_squared_xz, wall_forward, within_radius_xz

HIDE_RADIUS = 2.2      # m — how close the player must stand to enter
SEEN_RADIUS = 9.0      # m — a watching teacher this close blocks entry
HIDE_NOISE_RADIUS = 7.0
EXIT_OFFSET = 0.9      # m — step out in front of the closet


def _line_of_sight(
    cells: list[int], w: int, h: int,
    x1: float, z1: float, x2: float, z2: float,
) -> bool:
    """Straight line stays in walkable cells (same algorithm as the
    teacher AI, but parameterised on this lobby's grid dims)."""
    dx, dz = x2 - x1, z2 - z1
    dist = math.hypot(dx, dz)
    if dist < 0.01:
        return True
    step = CELL_SIZE * 0.4
    n = max(2, int(dist / step) + 1)
    for i in range(1, n):
        t = i / n
        cx = int((x1 + dx * t) / CELL_SIZE)
        cz = int((z1 + dz * t) / CELL_SIZE)
        if not (0 <= cx < w and 0 <= cz < h) or cells[cz * w + cx] != 1:
            return False
    return True


def _nearest_free(lobby: Lobby, x: float, z: float) -> Hideout | None:
    best: Hideout | None = None
    best_d = HIDE_RADIUS * HIDE_RADIUS
    for ho in lobby.hideouts.values():
        d = distance_squared_xz(ho.x, ho.z, x, z)
        if d <= best_d:
            best_d = d
            best = ho
    return best


async def handle_hide(lobby: Lobby, me: PlayerConn) -> None:
    if lobby.world is None:
        return
    if me.hidden_in is not None:
        await _exit(lobby, me)
        return
    if not is_active(lobby, me):
        return
    ho = _nearest_free(lobby, me.x, me.z)
    if ho is None:
        return
    if ho.occupied_by is not None:
        await send_safe(me, {"type": "hide_denied", "reason": "occupied"})
        return
    grid = lobby.world.grid
    for t in lobby.teachers:
        if not within_radius_xz(t.x, t.z, me.x, me.z, SEEN_RADIUS):
            continue
        if _line_of_sight(grid.cells, grid.width, grid.height, t.x, t.z, me.x, me.z):
            await send_safe(me, {"type": "hide_denied", "reason": "seen"})
            return
    ho.occupied_by = me.id
    me.hidden_in = ho.id
    me.x, me.z = ho.x, ho.z
    emit_noise(lobby, ho.x, ho.z, HIDE_NOISE_RADIUS)
    await broadcast(lobby, {
        "type": "player_hidden", "id": me.id, "hidden": True, "x": ho.x, "z": ho.z,
    })


async def _exit(lobby: Lobby, me: PlayerConn) -> None:
    ho = lobby.hideouts.get(me.hidden_in or "")
    me.hidden_in = None
    if ho is None:
        return
    ho.occupied_by = None
    dx, dz = wall_forward(ho.yaw, EXIT_OFFSET)
    me.x, me.z = ho.x + dx, ho.z + dz
    emit_noise(lobby, ho.x, ho.z, HIDE_NOISE_RADIUS)
    await broadcast(lobby, {
        "type": "player_hidden", "id": me.id, "hidden": False, "x": me.x, "z": me.z,
    })


def free_hideout_for(lobby: Lobby, player_id: str) -> None:
    """Disconnect cleanup: release the closet without broadcasting (the
    player_leave packet already removes the voxel client-side)."""
    for ho in lobby.hideouts.values():
        if ho.occupied_by == player_id:
            ho.occupied_by = None
    p = lobby.conns.get(player_id)
    if p is not None:
        p.hidden_in = None
