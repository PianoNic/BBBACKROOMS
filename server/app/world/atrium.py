"""Atrium decoration: corner plants, central cluster, perimeter paintings + benches.

Wing exits are at the middle of each atrium wall — we leave a clear corridor
of OPENING_CLEAR meters there so nothing blocks them.
"""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.constants import CELL_SIZE
from app.world.layout import Rect

OPENING_CLEAR = 2.5   # half-width of the open band at each wall midpoint
PAINTING_RATE = 0.7
BENCH_RATE = 0.6
PAINTING_VARIANTS = 24


def decorate_atrium(atrium: Rect, rng: random.Random) -> list[Prop]:
    cs = CELL_SIZE
    x_min, z_min = atrium.x * cs, atrium.y * cs
    x_max, z_max = (atrium.x + atrium.w) * cs, (atrium.y + atrium.h) * cs
    cx, cz = (x_min + x_max) / 2, (z_min + z_max) / 2
    props: list[Prop] = []

    # Corner plants
    margin = 0.5
    for x, z in (
        (x_min + margin, z_min + margin),
        (x_max - margin, z_min + margin),
        (x_min + margin, z_max - margin),
        (x_max - margin, z_max - margin),
    ):
        props.append(Prop(type="plant", x=x, z=z, yaw=rng.uniform(0, math.tau)))

    # Central plant cluster
    for ox, oz in ((-1.6, -1.6), (1.6, -1.6), (-1.6, 1.6), (1.6, 1.6)):
        if rng.random() < 0.6:
            props.append(Prop(type="plant", x=cx + ox, z=cz + oz, yaw=rng.uniform(0, math.tau)))

    # Perimeter paintings + benches per wall. Each wall has two slots, off to
    # the side of the centre opening.
    # (wall_yaw_painting, wall_yaw_bench, slot_positions_fn(off) -> (x, z))
    walls = (
        # North wall
        (math.pi, math.pi, lambda off: ((cx + off, z_min + 0.02), (cx + off, z_min + 0.4))),
        # South wall
        (0.0, 0.0, lambda off: ((cx + off, z_max - 0.02), (cx + off, z_max - 0.4))),
        # West wall
        (-math.pi / 2, -math.pi / 2, lambda off: ((x_min + 0.02, cz + off), (x_min + 0.4, cz + off))),
        # East wall
        (math.pi / 2, math.pi / 2, lambda off: ((x_max - 0.02, cz + off), (x_max - 0.4, cz + off))),
    )
    for painting_yaw, bench_yaw, slot in walls:
        for off in (-OPENING_CLEAR - 1.6, OPENING_CLEAR + 1.6):
            (pxz, bxz) = slot(off)
            if rng.random() < PAINTING_RATE:
                props.append(Prop(type="painting", x=pxz[0], z=pxz[1], yaw=painting_yaw, variant=rng.randrange(PAINTING_VARIANTS)))
            if rng.random() < BENCH_RATE:
                props.append(Prop(type="bench", x=bxz[0], z=bxz[1], yaw=bench_yaw))

    return props
