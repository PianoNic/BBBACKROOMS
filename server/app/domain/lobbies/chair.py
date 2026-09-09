from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Chair:
    """Resting (home_*) + current (x/z/yaw) pose. Equal while idle;
    diverge after a drop."""
    id: str
    home_x: float
    home_z: float
    home_yaw: float
    x: float
    z: float
    yaw: float
    held_by: str | None = None
