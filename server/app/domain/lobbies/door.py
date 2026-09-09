from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Door:
    """Classroom doorway with a hinged, openable panel. Non-blocking —
    purely atmospheric + an interactable for players and teachers."""
    id: str
    x: float
    z: float
    yaw_closed: float
    is_open: bool = False
    # Per-door cooldown so teachers don't flap the same door every tick.
    teacher_cooldown_until: float = 0.0
