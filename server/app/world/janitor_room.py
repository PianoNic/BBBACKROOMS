"""Janitor's room: fuse box on the back wall, mop buckets + closets +
bins. Cluttered + utilitarian on purpose."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.frame import make_frame
from app.world.layout import Room


def decorate_janitor_room(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    props: list[Prop] = []
    if f.depth < 2.4 or f.width < 2.4:
        return props

    # Fuse box on the back wall.
    fb_w = rng.uniform(-f.width / 4, f.width / 4)
    x, z = f.place(f.depth - 0.05, fb_w)
    props.append(Prop(
        type="fuse_box", x=x, z=z, yaw=f.front_yaw + math.pi,
    ))

    # A closet on a side wall.
    closet_side = rng.choice([-1, 1])
    closet_yaw = f.side_a_yaw if closet_side == 1 else f.side_b_yaw
    x, z = f.place(f.depth - 1.2, closet_side * (f.width / 2 - 0.25))
    props.append(Prop(type="closet", x=x, z=z, yaw=closet_yaw))

    # Second closet on the same wall, if there's room.
    if f.depth >= 4:
        x, z = f.place(f.depth - 2.5, closet_side * (f.width / 2 - 0.25))
        props.append(Prop(type="closet", x=x, z=z, yaw=closet_yaw))

    # Two mop buckets, one in each front corner of the opposite wall.
    mop_side = -closet_side
    for d in (0.7, 1.6):
        x, z = f.place(d, mop_side * (f.width / 2 - 0.4))
        props.append(Prop(type="mop_bucket", x=x, z=z,
                          yaw=rng.uniform(0, math.tau)))

    # Recycle bin trio in the middle of the room.
    for i, variant in enumerate((0, 1, 2)):
        d = 1.0 + i * 0.5
        if d > f.depth - 1.0:
            break
        x, z = f.place(d, 0)
        props.append(Prop(
            type="recycle_bin", x=x, z=z, yaw=f.front_yaw, variant=variant,
        ))

    # Trash can.
    x, z = f.place(rng.uniform(1.3, max(1.4, f.depth - 1.3)),
                   closet_side * 0.6)
    props.append(Prop(type="trash_can", x=x, z=z, yaw=0.0))

    # Scattered papers for clutter.
    for _ in range(rng.randint(1, 3)):
        d = rng.uniform(1.0, f.depth - 0.8)
        w = rng.uniform(-f.width / 2 + 0.5, f.width / 2 - 0.5)
        x, z = f.place(d, w)
        props.append(Prop(type="papers", x=x, z=z, yaw=rng.uniform(0, math.tau)))

    return props
