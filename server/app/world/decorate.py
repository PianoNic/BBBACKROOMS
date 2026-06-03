"""Top-level decoration: hallway lights + per-room props.

All room decoration goes through the single `decorate_room` function in
`decorator.py` — this module is just orchestration: ceiling lights for
rooms, light strips for hallways, and the dispatch loop."""
from __future__ import annotations

import math
import random

from app.schemas.world import Light, Prop
from app.world.constants import CELL_SIZE, HALL_LIGHT_SPACING, HALL_THICKNESS
from app.world.decorator import decorate_atrium, decorate_room
from app.world.layout import Layout, Rect, Room


def _hallway_lights(hall: Rect) -> list[Light]:
    lights: list[Light] = []
    if min(hall.w, hall.h) > HALL_THICKNESS + 1:
        for y in range(hall.y + 1, hall.y + hall.h - 1, HALL_LIGHT_SPACING):
            for x in range(hall.x + 1, hall.x + hall.w - 1, HALL_LIGHT_SPACING):
                lights.append(Light(
                    x=(x + 0.5) * CELL_SIZE, z=(y + 0.5) * CELL_SIZE, yaw=0.0,
                ))
        return lights
    if hall.w >= hall.h:
        cz = (hall.y + hall.h / 2) * CELL_SIZE
        for x in range(hall.x + 1, hall.x + hall.w - 1, HALL_LIGHT_SPACING):
            lights.append(Light(
                x=(x + 0.5) * CELL_SIZE, z=cz, yaw=0.0,
            ))
    else:
        cx = (hall.x + hall.w / 2) * CELL_SIZE
        for y in range(hall.y + 1, hall.y + hall.h - 1, HALL_LIGHT_SPACING):
            lights.append(Light(
                x=cx, z=(y + 0.5) * CELL_SIZE, yaw=math.pi / 2,
            ))
    return lights


def _room_ceiling_light(room: Room) -> Light:
    r = room.rect
    yaw = 0.0 if room.front_dir in ("N", "S") else math.pi / 2
    return Light(
        x=(r.x + r.w / 2) * CELL_SIZE, z=(r.y + r.h / 2) * CELL_SIZE, yaw=yaw,
    )


def decorate(layout: Layout, rng: random.Random) -> tuple[list[Light], list[Prop]]:
    lights: list[Light] = []
    props: list[Prop] = []
    for hall in layout.hallways:
        lights.extend(_hallway_lights(hall))
    if layout.atrium is not None:
        props.extend(decorate_atrium(layout.atrium, rng))
    for room in layout.rooms:
        lights.append(_room_ceiling_light(room))
        props.extend(decorate_room(room, rng))
    return lights, props
