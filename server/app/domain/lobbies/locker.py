from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Locker:
    """School locker. `item` is the hidden pickup kind, or None for empty.
    Opening drops it as a regular `Pickup` at the locker's position."""
    id: str
    x: float
    z: float
    yaw: float
    opened: bool = False
    item: str | None = None  # PickupKind | None
