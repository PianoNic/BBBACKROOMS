"""Per-archetype inventory declarations.

This file IS the decoration design doc. Every room type lists what props
can exist inside it, how many, and any placement constraints. The
`decorator` module turns each list into world-space `Prop`s via the
occupancy grid — no per-room imperative code, no overrides.

Slot options:
- `count`: (min, max). Actual count is rng.randint(min, max).
- `wall`: pin a wall prop to a specific wall ("front", "back",
  "side_a", "side_b"). Default: any free wall.
- `on`: for `on_top` props, the parent prop type that must be underneath.
- `pattern`: "default" | "grid_fill" | "paired" (see decorator.py).
- `pair_with`: for pattern="paired", the partner prop type.
- `variants`: ids to choose from (paintings have 24, default just 0).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.world.room_grid import Wall

Pattern = Literal["default", "grid_fill", "paired"]


@dataclass
class Slot:
    type: str
    count: tuple[int, int] = (1, 1)
    wall: Wall | None = None
    on: str | None = None
    pattern: Pattern = "default"
    pair_with: str | None = None
    variants: tuple[int, ...] = (0,)
    centered: bool = False  # for wall props: prefer the middle anchor


_PAINTING_VARIANTS = tuple(range(24))


INVENTORIES: dict[str, list[Slot]] = {
    "cafeteria": [
        Slot("counter", count=(2, 3), wall="side_a"),
        Slot("microwave", count=(1, 2), on="counter"),
        Slot("vending_machine", count=(2, 3), wall="side_b"),
        Slot("coffee_machine", count=(1, 1), wall="side_b"),
        Slot("cafeteria_table", count=(3, 6)),
        Slot("recycle_bin", count=(2, 3)),
        Slot("trash_can", count=(0, 1)),
        Slot("plant", count=(1, 2)),
        Slot("painting", count=(1, 2), wall="back", variants=_PAINTING_VARIANTS),
        Slot("backpack", count=(0, 2)),
        Slot("papers", count=(1, 3)),
    ],
    "classroom": [
        # "back" = wall opposite the door. Whiteboard, clock, and the
        # teacher's desk all anchor there; the desk faces the students.
        Slot("whiteboard", count=(1, 1), wall="back", centered=True),
        Slot("clock", count=(1, 1), wall="back"),
        Slot("desk", count=(1, 1), pattern="paired", pair_with="chair"),
        Slot("projector", count=(0, 1), on="desk"),
        Slot("globe", count=(0, 1), on="desk"),
        Slot("books_pile", count=(0, 1), on="desk"),
        Slot("student_desk", count=(0, 99), pattern="grid_fill"),
        Slot("locker", count=(2, 4), wall="side_a"),
        Slot("locker", count=(2, 4), wall="side_b"),
        Slot("bookshelf", count=(0, 1)),
        Slot("cupboard", count=(0, 1)),
        Slot("radiator", count=(0, 1)),
        Slot("painting", count=(1, 2), variants=_PAINTING_VARIANTS),
        Slot("plant", count=(0, 2)),
        Slot("trash_can", count=(0, 1)),
        Slot("backpack", count=(1, 2)),
        Slot("papers", count=(1, 3)),
    ],
    "teacher_room": [
        Slot("desk", count=(2, 3), pattern="paired", pair_with="chair"),
        Slot("laptop", count=(1, 1), on="desk"),
        Slot("books_pile", count=(0, 1), on="desk"),
        Slot("cupboard", count=(1, 2), wall="side_a"),
        Slot("closet", count=(1, 2), wall="side_b"),
        Slot("bookshelf", count=(0, 1)),
        Slot("plant", count=(1, 2)),
        Slot("painting", count=(1, 2), wall="front", variants=_PAINTING_VARIANTS),
        Slot("trash_can", count=(0, 1)),
        Slot("papers", count=(1, 2)),
    ],
    "toilet": [
        Slot("urinal", count=(1, 3), wall="side_a"),
        Slot("toilet_stall", count=(1, 3), wall="side_a"),
        Slot("sink", count=(1, 3), wall="side_b"),
        Slot("trash_can", count=(0, 1)),
        Slot("papers", count=(0, 2)),
    ],
    "gym": [
        Slot("basketball_hoop", count=(1, 1), wall="front"),
        Slot("basketball_hoop", count=(1, 1), wall="back"),
        Slot("gym_mat", count=(2, 5)),
        Slot("bench", count=(1, 2), wall="side_a"),
        Slot("bench", count=(1, 2), wall="side_b"),
        Slot("pylon", count=(3, 5)),
        Slot("closet", count=(1, 1), wall="front"),
        Slot("trash_can", count=(0, 1)),
    ],
    "janitor_room": [
        Slot("fuse_box", count=(1, 1), wall="back"),
        Slot("closet", count=(1, 2), wall="side_a"),
        Slot("mop_bucket", count=(2, 3)),
        Slot("recycle_bin", count=(2, 3)),
        Slot("trash_can", count=(0, 1)),
        Slot("papers", count=(1, 3)),
    ],
    "server_room": [
        Slot("server_rack", count=(0, 99), pattern="grid_fill"),
        Slot("fire_extinguisher", count=(1, 1), wall="front"),
        Slot("pylon", count=(0, 1)),
    ],
}


# === Atrium: special-case Rect (not a Room), declared here for parity. ===
ATRIUM_INVENTORY: list[Slot] = [
    Slot("plant", count=(4, 6)),
    Slot("bench", count=(2, 3)),
    Slot("painting", count=(2, 3), variants=_PAINTING_VARIANTS),
]
