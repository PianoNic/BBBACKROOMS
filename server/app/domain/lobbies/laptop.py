from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Laptop:
    id: str
    x: float
    z: float
    yaw: float
    game: str
    # teams_*/moodle_*: per-laptop random state (options + correct answer).
    # Casino games (slots/dice/coinflip) leave this empty — they roll fresh.
    challenge: dict = field(default_factory=dict)
    # rpg_battle: in-flight battle state per player id (HP values). Dropped
    # when the player reopens the laptop, dies in battle, or wins.
    battles: dict[str, dict] = field(default_factory=dict)
