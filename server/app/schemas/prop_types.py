"""Prop / item type aliases pulled out of `world.py` so both files stay
small. The string lists are the source of truth for what's renderable
client-side and placeable server-side."""
from __future__ import annotations

from typing import Literal

PropType = Literal[
    "desk",
    "chair",
    "student_desk",
    "whiteboard",
    "cupboard",
    "closet",
    "trash_can",
    "painting",
    "plant",
    "toilet_stall",
    "sink",
    "bench",
    "papers",
    "laptop",
    "urinal",
    "bookshelf",
    "clock",
    "globe",
    "swiss_flag",
    "projector",
    "bulletin_board",
    "radiator",
    "backpack",
    "books_pile",
    "fire_extinguisher",
    "locker",
    "floor_lamp",
    # Cafeteria + gym + janitor + atmosphere.
    "vending_machine",
    "coffee_machine",
    "microwave",
    "counter",
    "fuse_box",
    "recycle_bin",      # variant: 0=paper, 1=PET, 2=alu
    "exit_sign",
    "gym_mat",
    "basketball_hoop",
    "cafeteria_table",
    "pylon",
    "mop_bucket",
    "server_rack",
    # Teacher-room additions.
    "printer",
    "sofa",
    "fridge",
    "side_table",
    # Classroom variety.
    "map",
    "chalkboard",
    "coat_rack",
    "microscope",
]


ItemType = Literal[
    "notebook",
    "pencil_case",
    "papers",
    "calculator",
    "textbook",
    "mug",
    "key",
    "phone",
    "toilet_paper",
    "gloves",
    "envelope",
    "sponge",
    "eye",
    "watering_can",
    "hdd",
]
