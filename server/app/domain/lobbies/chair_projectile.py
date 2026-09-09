from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ChairProjectile:
    id: str            # unique flight id
    chair_id: str
    owner_id: str
    x: float
    z: float
    vx: float
    vz: float
    spawn_t: float     # monotonic seconds
