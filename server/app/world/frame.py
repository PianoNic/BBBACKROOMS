"""Per-room coordinate frame shared by all archetype decorators.

`make_frame(room)` returns a `Frame` whose `place(depth, width)` puts world
coords on a (depth, width) grid aligned with the room. `front_yaw` orients
props on the front/back walls; `side_a_yaw`/`side_b_yaw` orient props on the
two side walls; `door_w` lets decorators avoid blocking the door.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable

from app.world.constants import CELL_SIZE
from app.world.layout import Room

Placer = Callable[[float, float], tuple[float, float]]


@dataclass
class Frame:
    place: Placer
    front_yaw: float
    side_a_yaw: float
    side_b_yaw: float
    depth: float
    width: float
    door_w: float


def make_frame(room: Room) -> Frame:
    r = room.rect
    cs = CELL_SIZE
    # Prop-builder convention: a wall prop's visible front is at LOCAL
    # -Z. wall_yaw rotates the model so that direction points INTO the
    # room. Centre-piece props (desks, tables) use front_yaw directly.
    if room.front_dir == "N":
        fx, fz = (r.x + r.w / 2) * cs, r.y * cs
        return Frame(
            lambda d, w: (fx + w, fz + d),
            math.pi, math.pi / 2, -math.pi / 2,
            r.h * cs, r.w * cs, room.door_w,
        )
    if room.front_dir == "S":
        fx, fz = (r.x + r.w / 2) * cs, (r.y + r.h) * cs
        return Frame(
            lambda d, w: (fx + w, fz - d),
            0.0, math.pi / 2, -math.pi / 2,
            r.h * cs, r.w * cs, room.door_w,
        )
    if room.front_dir == "W":
        fx, fz = r.x * cs, (r.y + r.h / 2) * cs
        return Frame(
            lambda d, w: (fx + d, fz + w),
            -math.pi / 2, 0.0, math.pi,
            r.w * cs, r.h * cs, room.door_w,
        )
    fx, fz = (r.x + r.w) * cs, (r.y + r.h / 2) * cs
    return Frame(
        lambda d, w: (fx - d, fz + w),
        math.pi / 2, 0.0, math.pi,
        r.w * cs, r.h * cs, room.door_w,
    )
