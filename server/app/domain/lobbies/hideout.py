from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Hideout:
    """A closet a player can hide inside. Invisible to teachers while
    occupied; one player per closet."""
    id: str
    x: float
    z: float
    yaw: float
    occupied_by: str | None = None
