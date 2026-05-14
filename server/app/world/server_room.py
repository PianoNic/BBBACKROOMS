"""Server room: data-centre style rows of racks filling the floor.

Racks form parallel rows down the room with walkable aisles between
them. Each rack has its own collider (see client/world/colliders.ts) so
players can't squeeze through them — they must use the aisles."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.frame import make_frame
from app.world.layout import Room

# Visual footprint of a rack. Width = its long side (along the row),
# depth = its short side (perpendicular to the row).
RACK_WIDTH = 0.85    # spacing between rack centres in a row
RACK_DEPTH = 0.55    # space the rack itself takes perpendicular to the row
AISLE_DEPTH = 1.8    # gap between rows so players can walk between
ROW_INSET = 1.0      # how far the first row sits from the front wall
SIDE_INSET = 0.8     # how far rack rows stop short of the side walls


def decorate_server_room(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    props: list[Prop] = []
    if f.depth < 3.5 or f.width < 3.5:
        return props

    # How many rows of racks fit along the depth?
    usable_depth = f.depth - 2 * ROW_INSET
    row_pitch = RACK_DEPTH + AISLE_DEPTH
    n_rows = max(1, min(3, int((usable_depth + AISLE_DEPTH) / row_pitch)))
    # How many racks per row?
    usable_width = f.width - 2 * SIDE_INSET
    n_per_row = max(2, min(6, int(usable_width / RACK_WIDTH)))

    # Each row is a back-to-back pair facing opposite aisles. For simplicity
    # we render them as one row facing the door — the visual is "all racks
    # face the player as they walk in".
    for row in range(n_rows):
        d = ROW_INSET + row * row_pitch + RACK_DEPTH / 2
        # Centre the racks on the room's width axis.
        start_w = -(n_per_row - 1) * RACK_WIDTH / 2
        for col in range(n_per_row):
            w = start_w + col * RACK_WIDTH
            x, z = f.place(d, w)
            # All racks in a given row face the same way (toward the door).
            props.append(Prop(type="server_rack", x=x, z=z, yaw=f.front_yaw))

    # Fire extinguisher near the door.
    door_side = -1 if f.door_w < 0 else 1
    x, z = f.place(0.4, door_side * 0.8)
    props.append(Prop(type="fire_extinguisher", x=x, z=z, yaw=f.front_yaw))

    # A pylon by the back wall — sells the "construction in progress" vibe.
    if rng.random() < 0.6:
        x, z = f.place(f.depth - 0.6, 0)
        props.append(Prop(
            type="pylon", x=x, z=z, yaw=rng.uniform(0, math.tau),
        ))

    return props
