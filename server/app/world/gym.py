"""Gym (Sporthalle): hoops on the end walls, mats arranged in zones, a
slalom of pylons in the middle, benches against both side walls."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.frame import make_frame
from app.world.layout import Room


def decorate_gym(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    props: list[Prop] = []
    if f.depth < 4 or f.width < 4:
        return props

    # Backboards on the front + back wall.
    if f.width >= 5:
        x, z = f.place(f.depth - 0.15, 0)
        props.append(Prop(type="basketball_hoop", x=x, z=z, yaw=f.front_yaw + math.pi))
        x, z = f.place(0.15, 0)
        props.append(Prop(type="basketball_hoop", x=x, z=z, yaw=f.front_yaw))

    # Mat zones: two rows of mats running down both side walls. More mats
    # than the old single-row layout so the floor looks "in use".
    mat_pitch = 1.95
    n_mats = max(2, min(5, int((f.depth - 2.0) / mat_pitch)))
    for side in (-1, 1):
        mat_yaw = f.side_a_yaw if side == 1 else f.side_b_yaw
        for i in range(n_mats):
            d = 1.5 + i * mat_pitch
            if d > f.depth - 1.2:
                break
            x, z = f.place(d, side * (f.width / 2 - 1.0))
            props.append(Prop(type="gym_mat", x=x, z=z, yaw=mat_yaw))

    # Benches against the two long walls (in addition to mats).
    bench_yaw_a = f.side_a_yaw
    bench_yaw_b = f.side_b_yaw
    bx, bz = f.place(f.depth / 2, f.width / 2 - 0.22)
    props.append(Prop(type="bench", x=bx, z=bz, yaw=bench_yaw_a))
    bx, bz = f.place(f.depth / 2, -(f.width / 2 - 0.22))
    props.append(Prop(type="bench", x=bx, z=bz, yaw=bench_yaw_b))

    # A line of pylons forming a slalom course down the middle aisle.
    pylon_pitch = 1.1
    n_pylons = max(3, min(6, int((f.depth - 2.5) / pylon_pitch)))
    for i in range(n_pylons):
        d = 1.5 + (i + 0.5) * pylon_pitch
        # Alternate sides for the slalom feel.
        w_off = 0.6 if (i % 2 == 0) else -0.6
        x, z = f.place(d, w_off)
        props.append(Prop(type="pylon", x=x, z=z, yaw=rng.uniform(0, math.tau)))

    # A locker-style closet near the door for sports gear.
    door_side = -1 if f.door_w < 0 else 1
    x, z = f.place(0.7, door_side * (f.width / 2 - 0.3))
    props.append(Prop(type="closet", x=x, z=z,
                      yaw=f.side_b_yaw if door_side > 0 else f.side_a_yaw))

    # A trash can near the door.
    x, z = f.place(0.6, -door_side * 0.9)
    props.append(Prop(type="trash_can", x=x, z=z, yaw=0.0))

    return props
