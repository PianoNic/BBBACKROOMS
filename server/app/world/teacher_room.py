"""Teacher room: row of workstations (desk + chair), storage along side walls."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.frame import make_frame
from app.world.layout import Room

DOOR_CLEARANCE = 1.2


def decorate_teacher_room(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    props: list[Prop] = []
    if f.depth < 4 or f.width < 4:
        return props

    # Workstations: row of desks each with a chair behind (toward the door wall).
    desk_d = min(2.7, f.depth / 2)
    chair_d = desk_d - 0.7  # closer to the front wall
    half = f.width / 2 - 0.9
    w = -half
    desks: list[tuple[float, float]] = []
    while w <= half:
        dx, dz = f.place(desk_d, w)
        cx, cz = f.place(chair_d, w)
        props.append(Prop(type="desk", x=dx, z=dz, yaw=f.front_yaw))
        props.append(Prop(type="chair", x=cx, z=cz, yaw=f.front_yaw))
        desks.append((dx, dz))
        w += 2.4

    # One laptop per teacher room, on a random desk.
    # variant 0 = coinflip (only game implemented for now).
    if desks:
        lx, lz = rng.choice(desks)
        props.append(Prop(type="laptop", x=lx, z=lz, yaw=f.front_yaw, variant=0))

    # Side-wall storage: a couple of cupboards/closets per side.
    for side in (-1, 1):
        yaw = f.side_a_yaw if side == 1 else f.side_b_yaw
        slot_count = max(1, int((f.depth - 4.5) / 1.6))
        for i in range(slot_count):
            d = 4.0 + i * 1.8
            if d > f.depth - 0.8:
                break
            if rng.random() < 0.65:
                kind = rng.choice(["cupboard", "closet"])
                x, z = f.place(d, side * (f.width / 2 - 0.3))
                props.append(Prop(type=kind, x=x, z=z, yaw=yaw))

    # Plants near front corners.
    for w_off in (-f.width / 2 + 0.4, f.width / 2 - 0.4):
        if rng.random() < 0.6:
            x, z = f.place(0.45, w_off)
            props.append(Prop(type="plant", x=x, z=z, yaw=rng.uniform(0, math.tau)))

    # A painting or two on the front wall.
    for w_off in (-1.6, 1.6):
        if rng.random() < 0.5:
            x, z = f.place(0.05, w_off)
            # Default painting back at +Z → on front wall (-depth) the back must
            # face -depth, so rotate by pi relative to front_yaw.
            props.append(Prop(type="painting", x=x, z=z, yaw=f.front_yaw + math.pi, variant=rng.randrange(24)))

    # Trash can near a side.
    if rng.random() < 0.6:
        side = rng.choice([-1, 1])
        x, z = f.place(rng.uniform(1.0, 2.0), side * (f.width / 2 - 0.4))
        props.append(Prop(type="trash_can", x=x, z=z, yaw=0.0))

    return props
