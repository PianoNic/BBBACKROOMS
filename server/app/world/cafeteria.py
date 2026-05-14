"""Cafeteria: two rows of long tables, a serving counter with microwaves on
one side wall, vending + coffee on the other, recycle-bin trio near the door,
plants + posters for life."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.frame import make_frame
from app.world.layout import Room


def decorate_cafeteria(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    props: list[Prop] = []
    if f.depth < 4 or f.width < 3:
        return props

    # Two rows of long tables down the middle so the room doesn't read
    # half-empty. Tighter pitch + offset rows = denser canteen feel.
    table_pitch = 1.3
    n_tables = max(2, min(6, int((f.depth - 1.0) / table_pitch)))
    rows = (-0.9, 0.9) if f.width >= 4.5 else (0.0,)
    for i in range(n_tables):
        d = 1.0 + (i + 0.5) * table_pitch
        if d > f.depth - 0.8:
            break
        for w in rows:
            x, z = f.place(d, w)
            props.append(Prop(
                type="cafeteria_table", x=x, z=z,
                yaw=f.front_yaw + math.pi / 2,
            ))

    # Serving line on one side wall: counter + 2 microwaves on top + sink
    # of vending/coffee on the opposite side wall.
    counter_side = rng.choice([-1, 1])
    appliance_side = -counter_side
    counter_yaw = f.side_a_yaw if counter_side == 1 else f.side_b_yaw
    appliance_yaw = f.side_a_yaw if appliance_side == 1 else f.side_b_yaw
    counter_w = counter_side * (f.width / 2 - 0.4)
    appliance_w = appliance_side * (f.width / 2 - 0.4)

    # Two counters, each carries a microwave on top.
    counter_ds = [1.8, 3.6]
    for d in counter_ds:
        if d > f.depth - 1.2:
            break
        x, z = f.place(d, counter_w)
        props.append(Prop(type="counter", x=x, z=z, yaw=counter_yaw))
        # Microwave on top — push slightly inboard so it sits on the counter.
        mx, mz = f.place(d, counter_w - counter_side * 0.1)
        props.append(Prop(type="microwave", x=mx, z=mz, yaw=counter_yaw))

    # Appliances against the OTHER side wall.
    appliance_d = [1.4, 2.6, 3.8, 5.0]
    appliance_types = ["vending_machine", "coffee_machine",
                       "vending_machine", "vending_machine"]
    for d, t in zip(appliance_d, appliance_types):
        if d > f.depth - 0.5:
            break
        x, z = f.place(d, appliance_w)
        props.append(Prop(type=t, x=x, z=z, yaw=appliance_yaw))

    # Recycle bin trio near the door (paper, PET, alu).
    door_offset = max(0.6, abs(f.door_w) + 0.6)
    side = 1 if f.door_w < 0 else -1
    base_w = side * door_offset
    for i, variant in enumerate((0, 1, 2)):
        x, z = f.place(0.6, base_w + side * i * 0.5)
        props.append(Prop(
            type="recycle_bin", x=x, z=z, yaw=f.front_yaw, variant=variant,
        ))

    # Painting on the back wall.
    x, z = f.place(f.depth - 0.05, rng.uniform(-f.width / 4, f.width / 4))
    props.append(Prop(type="painting", x=x, z=z, yaw=f.front_yaw + math.pi))

    # A backpack on a random table for atmosphere.
    if rng.random() < 0.7 and n_tables > 0:
        d = 1.0 + (rng.randint(0, n_tables - 1) + 0.5) * table_pitch
        x, z = f.place(d, rng.choice([-0.4, 0.4]))
        props.append(Prop(type="backpack", x=x, z=z, yaw=rng.uniform(0, math.tau)))

    # Loose papers scattered for atmosphere.
    for _ in range(rng.randint(1, 3)):
        d = rng.uniform(1.0, f.depth - 1.0)
        w = rng.uniform(-f.width / 2 + 0.5, f.width / 2 - 0.5)
        x, z = f.place(d, w)
        props.append(Prop(type="papers", x=x, z=z, yaw=rng.uniform(0, math.tau)))

    return props
