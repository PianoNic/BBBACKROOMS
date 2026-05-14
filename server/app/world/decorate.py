"""Hallway lights + per-room decoration."""
from __future__ import annotations

import math
import random

from app.schemas.world import Light, Prop
from app.world.atrium import decorate_atrium
from app.world.cafeteria import decorate_cafeteria
from app.world.classroom import decorate_classroom
from app.world.gym import decorate_gym
from app.world.janitor_room import decorate_janitor_room
from app.world.server_room import decorate_server_room
from app.world.teacher_room import decorate_teacher_room
from app.world.toilet import decorate_toilet

DECORATORS = {
    "classroom": decorate_classroom,
    "teacher_room": decorate_teacher_room,
    "toilet": decorate_toilet,
    "gym": decorate_gym,
    "cafeteria": decorate_cafeteria,
    "janitor_room": decorate_janitor_room,
    "server_room": decorate_server_room,
}
from app.world.constants import CELL_SIZE, HALL_LIGHT_SPACING, HALL_THICKNESS
from app.world.frame import make_frame
from app.world.layout import Layout, Rect, Room

DOOR_CLEAR = 1.2


def _scatter_papers(room: Room, rng: random.Random) -> list[Prop]:
    f = make_frame(room)
    count = rng.randint(0, 3)
    props: list[Prop] = []
    for _ in range(count):
        d = rng.uniform(1.6, max(1.7, f.depth - 0.6))
        w = rng.uniform(-f.width / 2 + 0.5, f.width / 2 - 0.5)
        if abs(w - f.door_w) < DOOR_CLEAR and d > f.depth - 1.6:
            continue
        x, z = f.place(d, w)
        props.append(Prop(type="papers", x=x, z=z, yaw=rng.uniform(0, math.tau)))
    return props


def _hallway_lights(hall: Rect) -> list[Light]:
    lights: list[Light] = []
    # Wide hall (atrium): grid of lights
    if min(hall.w, hall.h) > HALL_THICKNESS + 1:
        for y in range(hall.y + 1, hall.y + hall.h - 1, HALL_LIGHT_SPACING):
            for x in range(hall.x + 1, hall.x + hall.w - 1, HALL_LIGHT_SPACING):
                lights.append(Light(x=(x + 0.5) * CELL_SIZE, z=(y + 0.5) * CELL_SIZE, yaw=0.0))
        return lights
    if hall.w >= hall.h:
        cz = (hall.y + hall.h / 2) * CELL_SIZE
        for x in range(hall.x + 1, hall.x + hall.w - 1, HALL_LIGHT_SPACING):
            lights.append(Light(x=(x + 0.5) * CELL_SIZE, z=cz, yaw=0.0))
    else:
        cx = (hall.x + hall.w / 2) * CELL_SIZE
        for y in range(hall.y + 1, hall.y + hall.h - 1, HALL_LIGHT_SPACING):
            lights.append(Light(x=cx, z=(y + 0.5) * CELL_SIZE, yaw=math.pi / 2))
    return lights


def _room_ceiling_light(room: Room) -> Light:
    r = room.rect
    yaw = 0.0 if room.front_dir in ("N", "S") else math.pi / 2
    return Light(x=(r.x + r.w / 2) * CELL_SIZE, z=(r.y + r.h / 2) * CELL_SIZE, yaw=yaw)


def decorate(layout: Layout, rng: random.Random) -> tuple[list[Light], list[Prop]]:
    lights: list[Light] = []
    props: list[Prop] = []
    for hall in layout.hallways:
        lights.extend(_hallway_lights(hall))
    if layout.atrium is not None:
        props.extend(decorate_atrium(layout.atrium, rng))
    for room in layout.rooms:
        lights.append(_room_ceiling_light(room))
        decorator = DECORATORS.get(room.archetype)
        if decorator:
            props.extend(decorator(room, rng))
        props.extend(_scatter_papers(room, rng))
    return lights, props
