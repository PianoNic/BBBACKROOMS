"""Tiny geometry helpers shared across services.

These exist so distance checks read like English instead of squared-math:

    if within_radius(player, target, PICKUP_RADIUS):
        ...

instead of

    if (player.x - target.x) ** 2 + (player.z - target.z) ** 2 <= R * R:
        ...

Both forms compile to the same work (no sqrt), but the helper version is
self-documenting and impossible to typo (mixing x/z, forgetting to square
the radius, etc.).
"""
from __future__ import annotations

import math
from typing import Protocol


class HasXZ(Protocol):
    """Anything with `.x` and `.z` floats — players, pickups, teachers, props."""
    x: float
    z: float


def distance_squared(a: HasXZ, b: HasXZ) -> float:
    return (a.x - b.x) ** 2 + (a.z - b.z) ** 2


def within_radius(a: HasXZ, b: HasXZ, radius: float) -> bool:
    """True iff `a` and `b` are at most `radius` metres apart on the XZ plane."""
    return distance_squared(a, b) <= radius * radius


def within_radius_xz(ax: float, az: float, bx: float, bz: float, radius: float) -> bool:
    """Same as `within_radius` but for raw coordinates (e.g. corpse tuples)."""
    return (ax - bx) ** 2 + (az - bz) ** 2 <= radius * radius


def distance_squared_xz(ax: float, az: float, bx: float, bz: float) -> float:
    """Raw-coordinate version of `distance_squared`. Use for nearest-of-many
    loops where you want to compare distances without squaring a radius."""
    return (ax - bx) ** 2 + (az - bz) ** 2


def wall_forward(yaw: float, distance: float) -> tuple[float, float]:
    """XZ offset pointing away from a wall-mounted prop's face into the room.

    Wall-prop builders draw their visible front on local -Z; the placement
    code rotates yaw so local -Z lines up with the room direction. World
    "into the room" is therefore `(-sin yaw, -cos yaw) * distance`."""
    return -math.sin(yaw) * distance, -math.cos(yaw) * distance
