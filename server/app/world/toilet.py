"""Toilet: stalls on one side wall, sinks on the opposite wall."""
from __future__ import annotations

import random

from app.schemas.world import Prop
from app.world.frame import make_frame
from app.world.layout import Room


def decorate_toilet(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    props: list[Prop] = []
    if f.depth < 3 or f.width < 3:
        return props

    # Stalls along one side wall (pick which side; stalls extend 1m into the room).
    stall_side = rng.choice([-1, 1])
    stall_yaw = f.side_a_yaw if stall_side == 1 else f.side_b_yaw

    # Urinals fill the front portion of the stall wall.
    urinal_pitch = 0.7
    n_urinals = max(1, min(3, int((f.depth - 2.0) / urinal_pitch / 2)))
    urinal_x_offset = stall_side * (f.width / 2 - 0.18)
    for i in range(n_urinals):
        d = 1.0 + (i + 0.5) * urinal_pitch
        x, z = f.place(d, urinal_x_offset)
        props.append(Prop(type="urinal", x=x, z=z, yaw=stall_yaw))

    # Stalls start behind the urinals, leaving a small gap.
    stall_pitch = 1.2
    stall_start = 1.0 + n_urinals * urinal_pitch + 0.4
    n_stalls = max(1, int((f.depth - stall_start - 0.5) / stall_pitch))
    for i in range(n_stalls):
        d = stall_start + (i + 0.5) * stall_pitch
        if d > f.depth - 0.6:
            break
        x, z = f.place(d, stall_side * (f.width / 2 - 0.5))
        props.append(Prop(type="toilet_stall", x=x, z=z, yaw=stall_yaw))

    # Sinks along the opposite wall.
    sink_side = -stall_side
    sink_yaw = f.side_a_yaw if sink_side == 1 else f.side_b_yaw
    sink_pitch = 0.9
    n_sinks = max(1, int((f.depth - 1.0) / sink_pitch))
    for i in range(n_sinks):
        d = 1.0 + (i + 0.5) * sink_pitch
        if d > f.depth - 0.5:
            break
        x, z = f.place(d, sink_side * (f.width / 2 - 0.2))
        props.append(Prop(type="sink", x=x, z=z, yaw=sink_yaw))

    # A trash can near the door (door is at depth 0, front of room).
    if rng.random() < 0.7:
        x, z = f.place(0.6, f.door_w + rng.choice([-1, 1]) * 0.9)
        props.append(Prop(type="trash_can", x=x, z=z, yaw=0.0))

    return props
