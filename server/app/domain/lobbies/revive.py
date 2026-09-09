from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Revive:
    """In-flight revive channel. One per reviver — they cancel automatically
    if the reviver moves, dies, or aborts."""
    reviver_id: str
    target_id: str
    start_x: float
    start_z: float
    started_at: float
    completes_at: float
