"""Classroom: whiteboard, teacher area, side-wall items, plants, student desks."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.classroom_desks import TEMPLATES
from app.world.frame import Frame, make_frame
from app.world.layout import Room

DOOR_CLEARANCE = 1.2


def _front_props(f: Frame, rng: random.Random) -> list[Prop]:
    wx, wz = f.place(0.05, 0.0)
    tx, tz = f.place(1.4, 0.0)
    cx, cz = f.place(0.8, 0.0)
    props: list[Prop] = [
        Prop(type="whiteboard", x=wx, z=wz, yaw=f.front_yaw),
        Prop(type="desk", x=tx, z=tz, yaw=f.front_yaw),
        Prop(type="chair", x=cx, z=cz, yaw=f.front_yaw),
    ]
    # Things mounted high on the front wall (above the whiteboard area).
    half = f.width / 2 - 0.4
    side_x_offset = max(1.6, half - 0.3)
    if rng.random() < 0.7:
        cx2, cz2 = f.place(0.05, -side_x_offset)
        props.append(Prop(type="clock", x=cx2, z=cz2, yaw=f.front_yaw))
    if rng.random() < 0.55:
        fx, fz = f.place(0.05, side_x_offset)
        props.append(Prop(type="swiss_flag", x=fx, z=fz, yaw=f.front_yaw))
    if rng.random() < 0.45:
        px, pz = f.place(1.5, 0.0)
        props.append(Prop(type="projector", x=px, z=pz, yaw=f.front_yaw))
    # Decor on the teacher's desk.
    desk_side = rng.choice([-0.4, 0.4])
    roll = rng.random()
    if roll < 0.35:
        gx, gz = f.place(1.4, desk_side)
        props.append(Prop(type="globe", x=gx, z=gz, yaw=f.front_yaw))
    elif roll < 0.7:
        bx, bz = f.place(1.4, desk_side)
        props.append(Prop(type="books_pile", x=bx, z=bz, yaw=f.front_yaw))
    return props


def _side_props(f: Frame, side: int, rng: random.Random) -> list[Prop]:
    props: list[Prop] = []
    yaw = f.side_a_yaw if side == 1 else f.side_b_yaw
    slot_count = max(1, int((f.depth - 3.5) / 1.6))
    for i in range(slot_count):
        d = 2.4 + (i + 0.5) * 1.6
        if d > f.depth - 1.0:
            break
        roll = rng.random()
        # Lockers are the only container with items, so bias the roll toward
        # them — most will be empty, which is the point (atmosphere of
        # searching). Other side-wall props stay rarer.
        if roll < 0.12:
            kind, inset = "cupboard", 0.3
        elif roll < 0.20:
            kind, inset = "closet", 0.3
        elif roll < 0.30:
            kind, inset = "painting", 0.06
        elif roll < 0.38:
            kind, inset = "bookshelf", 0.2
        elif roll < 0.44:
            kind, inset = "radiator", 0.06
        elif roll < 0.50:
            kind, inset = "bulletin_board", 0.06
        elif roll < 0.88:
            kind, inset = "locker", 0.2
        else:
            continue
        x, z = f.place(d, side * (f.width / 2 - inset))
        variant = rng.randrange(24) if kind == "painting" else 0
        props.append(Prop(type=kind, x=x, z=z, yaw=yaw, variant=variant))
    return props


def _door_wall_props(f: Frame, rng: random.Random) -> list[Prop]:
    props: list[Prop] = []
    d = f.depth - 0.06
    slot_count = max(1, int((f.width - 1.0) / 1.5))
    slot_w = (f.width - 1.0) / slot_count
    for i in range(slot_count):
        w = -f.width / 2 + 0.5 + (i + 0.5) * slot_w
        if abs(w - f.door_w) < DOOR_CLEARANCE:
            continue
        if rng.random() < 0.6:
            x, z = f.place(d, w)
            props.append(Prop(type="painting", x=x, z=z, yaw=f.front_yaw, variant=rng.randrange(24)))
    return props


def _corner_plants(f: Frame, rng: random.Random) -> list[Prop]:
    props: list[Prop] = []
    corners: list[tuple[float, float]] = [
        (0.45, -f.width / 2 + 0.4),
        (0.45, f.width / 2 - 0.4),
    ]
    for w in (-f.width / 2 + 0.4, f.width / 2 - 0.4):
        if abs(w - f.door_w) >= DOOR_CLEARANCE:
            corners.append((f.depth - 0.45, w))
    for d, w in corners:
        if rng.random() < 0.5:
            x, z = f.place(d, w)
            props.append(Prop(type="plant", x=x, z=z, yaw=rng.uniform(0, math.tau)))
    return props


def _trash_can(f: Frame, rng: random.Random) -> list[Prop]:
    if rng.random() > 0.6:
        return []
    side = rng.choice([-1, 1])
    x, z = f.place(rng.uniform(1.2, 2.0), side * (f.width / 2 - 0.4))
    return [Prop(type="trash_can", x=x, z=z, yaw=0.0)]


def _back_corner_extras(f: Frame, rng: random.Random) -> list[Prop]:
    """Floor-standing props in the back corners: lamp / fire extinguisher."""
    props: list[Prop] = []
    for side in (-1, 1):
        roll = rng.random()
        if roll < 0.25:
            x, z = f.place(f.depth - 0.4, side * (f.width / 2 - 0.4))
            props.append(Prop(type="floor_lamp", x=x, z=z, yaw=0.0))
        elif roll < 0.45:
            yaw = f.side_a_yaw if side == 1 else f.side_b_yaw
            x, z = f.place(f.depth - 0.6, side * (f.width / 2 - 0.1))
            props.append(Prop(type="fire_extinguisher", x=x, z=z, yaw=yaw))
    return props


def _stray_backpacks(f: Frame, rng: random.Random) -> list[Prop]:
    """A couple of backpacks dropped along the side walls."""
    props: list[Prop] = []
    for _ in range(rng.randint(0, 2)):
        side = rng.choice([-1, 1])
        d = rng.uniform(2.8, max(2.9, f.depth - 1.5))
        x, z = f.place(d, side * (f.width / 2 - 0.55))
        props.append(Prop(type="backpack", x=x, z=z, yaw=rng.uniform(0, math.tau)))
    return props


def decorate_classroom(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    return [
        *_front_props(f, rng),
        *_side_props(f, side=+1, rng=rng),
        *_side_props(f, side=-1, rng=rng),
        *_door_wall_props(f, rng),
        *_corner_plants(f, rng),
        *_trash_can(f, rng),
        *_back_corner_extras(f, rng),
        *_stray_backpacks(f, rng),
        *rng.choice(TEMPLATES)(f),
    ]
