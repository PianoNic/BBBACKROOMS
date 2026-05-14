"""Per-tick AI movement: target selection + greedy/BFS hybrid stepping.

The hybrid: if we have a clear line-of-sight to the target we walk straight
at it (no BFS, no waypoints — feels natural and is cheap). The moment a
wall blocks the line we fall back to a BFS path that handles corners and
doors. Replanning happens every `PATH_REPATH_INTERVAL` seconds or when the
target drifts more than `TARGET_DRIFT_CELLS` cells from the path's end."""
from __future__ import annotations

import math
import random

from app.world.constants import CELL_SIZE
from app.world.geom import distance_squared_xz
from app.world.layout import Rect
from app.world.pathfind import find_path_cells
from app.world.physics import (
    TEACHER_ARRIVE_DIST as ARRIVE_DIST,
    TEACHER_CHASE_RADIUS as CHASE_RADIUS,
    TEACHER_SPEED as SPEED,
)
from app.world.teachers import TeacherState, line_of_sight, get_grid_dims

# How often (seconds) to re-plan a BFS path. Chasing a moving player needs
# regular updates; patrolling can stay on its plan until the path is empty.
PATH_REPATH_INTERVAL = 0.6
# Replan immediately if the target drifts farther than this many cells from
# the path's last waypoint, even before PATH_REPATH_INTERVAL elapses.
TARGET_DRIFT_CELLS = 2
DOOR_NO_CAMP_RADIUS = 2.4  # m — teachers won't loiter this close to a door

# Per-ability chase-radius override (defaults to CHASE_RADIUS).
ABILITY_CHASE_RADIUS: dict[str, float] = {
    "taunt_shout":   24.0,  # Englisch — sees you from further
    "minimap_xray":  22.0,  # ICT — networked vision
    "time_warp":     20.0,  # Geschichte — remembers where you went
}

# Always-on speed multipliers for specific abilities.
_PASSIVE_SPEED: dict[str, float] = {
    "endurance":     1.12,  # Sport — never tires
    "geometry_walls":1.06,  # Math — straighter paths
}


def _ability_speed(t: TeacherState) -> float:
    return _PASSIVE_SPEED.get(t.ability, 1.0)


def _random_point_in_rect(r: Rect, rng: random.Random) -> tuple[float, float]:
    cx = rng.uniform(r.x + 0.5, r.x + r.w - 0.5)
    cz = rng.uniform(r.y + 0.5, r.y + r.h - 0.5)
    return cx * CELL_SIZE, cz * CELL_SIZE


def _too_close_to_door(
    x: float, z: float, doors: list[tuple[float, float]], r: float = DOOR_NO_CAMP_RADIUS,
) -> bool:
    r2 = r * r
    for dx, dz in doors:
        if (x - dx) * (x - dx) + (z - dz) * (z - dz) <= r2:
            return True
    return False


def _pick_patrol_target(
    t: TeacherState, hallways: list[Rect], rng: random.Random,
    doors: list[tuple[float, float]],
) -> tuple[float, float]:
    """Random point inside a random hallway, away from any room doorway."""
    if not hallways:
        return t.x, t.z
    candidates = hallways if len(hallways) <= 1 else rng.sample(hallways, min(len(hallways), 3))
    last = _random_point_in_rect(rng.choice(candidates), rng)
    for _ in range(8):
        cand = _random_point_in_rect(rng.choice(candidates), rng)
        if not _too_close_to_door(cand[0], cand[1], doors):
            return cand
        last = cand
    return last


def _pick_target(
    t: TeacherState, player_positions: list[tuple[float, float]],
    hallways: list[Rect], rng: random.Random, doors: list[tuple[float, float]],
) -> tuple[float, float]:
    """Chase the nearest player inside the ability's chase radius; otherwise
    keep the current patrol target until we arrive, then roll a fresh one."""
    radius = ABILITY_CHASE_RADIUS.get(t.ability, CHASE_RADIUS)
    if player_positions:
        nearest = min(
            player_positions,
            key=lambda p: distance_squared_xz(p[0], p[1], t.x, t.z),
        )
        if distance_squared_xz(nearest[0], nearest[1], t.x, t.z) <= radius * radius:
            return nearest
    arrived = distance_squared_xz(t.tx, t.tz, t.x, t.z) < ARRIVE_DIST * ARRIVE_DIST
    camping_door = _too_close_to_door(t.x, t.z, doors)
    if arrived or camping_door or (t.tx == t.x and t.tz == t.z):
        return _pick_patrol_target(t, hallways, rng, doors)
    return t.tx, t.tz


def _step_toward(t: TeacherState, gx: float, gz: float, dt: float) -> None:
    """Move one frame's worth toward (gx, gz). No-op if we're already there.
    Used by both greedy steering and path-following."""
    dx, dz = gx - t.x, gz - t.z
    d = math.hypot(dx, dz)
    if d < 1e-3:
        return
    step = min(SPEED * _ability_speed(t) * dt, d)
    t.x += dx / d * step
    t.z += dz / d * step


def _advance_along_path(t: TeacherState, dt: float) -> None:
    """Move toward the next waypoint, popping it on arrival."""
    if not t.path:
        return
    wx, wz = t.path[0]
    if distance_squared_xz(wx, wz, t.x, t.z) < ARRIVE_DIST * ARRIVE_DIST:
        t.path.pop(0)
        if not t.path:
            return
        wx, wz = t.path[0]
    _step_toward(t, wx, wz, dt)


def _needs_repath(
    t: TeacherState, target: tuple[float, float], now: float, drift_world_sq: float,
) -> bool:
    if not t.path:
        return True
    if now - t.last_repath_t >= PATH_REPATH_INTERVAL:
        return True
    last = t.path[-1]
    return distance_squared_xz(last[0], last[1], target[0], target[1]) > drift_world_sq


def _compute_path(
    cells: list[int], sx: float, sz: float, gx: float, gz: float,
) -> list[tuple[float, float]]:
    """BFS in cell space, returns world-coord waypoints (cell centres).
    Start cell is dropped; first waypoint is the next cell to step into."""
    gw, gh = get_grid_dims()
    start = (int(sx / CELL_SIZE), int(sz / CELL_SIZE))
    goal = (int(gx / CELL_SIZE), int(gz / CELL_SIZE))
    cell_path = find_path_cells(cells, gw, gh, start, goal)
    if len(cell_path) <= 1:
        return []
    return [((cx + 0.5) * CELL_SIZE, (cz + 0.5) * CELL_SIZE)
            for (cx, cz) in cell_path[1:]]


def step_teacher(
    t: TeacherState, cells: list[int],
    hallways: list[Rect], player_positions: list[tuple[float, float]],
    dt: float, rng: random.Random, doors: list[tuple[float, float]], now: float,
) -> None:
    """One AI tick for a single teacher. Picks a target, then either walks
    straight at it (clear LOS) or follows a BFS path around walls."""
    target = _pick_target(t, player_positions, hallways, rng, doors)
    t.tx, t.tz = target
    if line_of_sight(cells, t.x, t.z, target[0], target[1]):
        t.path = []
        _step_toward(t, target[0], target[1], dt)
        return
    drift_world_sq = (TARGET_DRIFT_CELLS * CELL_SIZE) ** 2
    if _needs_repath(t, target, now, drift_world_sq):
        t.path = _compute_path(cells, t.x, t.z, target[0], target[1])
        t.last_repath_t = now
    _advance_along_path(t, dt)


__all__ = ["step_teacher"]
