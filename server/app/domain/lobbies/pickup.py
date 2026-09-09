from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Pickup:
    id: str
    kind: str  # "medkit" | "potion" | "compass" | "tracker" | "goggles" | "gps"
    x: float
    z: float
