"""Per-archetype inventory declarations.

Every room type lists what props can exist inside it, how many, and any
placement constraints. The `decorator` module turns each list into
world-space `Prop`s via the occupancy grid — no per-room imperative
code, no overrides.

Slot options:
- `count` (min, max): actual count is rng.randint(min, max).
- `wall`: pin a wall prop to a specific wall ("front", "back",
  "side_a", "side_b"). Default: any free wall.
- `on`: for `on_top` props, the parent prop type that must be underneath.
- `pattern`: "default" | "grid_fill" | "paired" (see decorator.py).
- `pair_with`: for pattern="paired", the partner prop type.
- `variants`: ids to choose from (paintings have 24, default just 0).
- `centered`: for wall props — prefer the middle anchor.
- `aisle` / `aisle_w` / `aisle_d` / `front_reserve`: grid_fill tuning.
- `contiguous`: wall placements pack tight against each other (urinal
  rows, locker banks).
"""
from __future__ import annotations

from dataclasses import dataclass
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
    centered: bool = False
    aisle: int = 2
    front_reserve: int = 4
    aisle_w: int | None = None
    aisle_d: int | None = None
    contiguous: bool = False


_PAINTING_VARIANTS = tuple(range(24))


INVENTORIES: dict[str, list[Slot]] = {
    "cafeteria": [
        Slot("counter", count=(2, 3), wall="side_a"),
        Slot("microwave", count=(1, 2), on="counter"),  # always against a wall
        Slot("vending_machine", count=(2, 3), wall="side_b"),
        Slot("coffee_machine", count=(1, 1), wall="side_b"),
        # Big aisle_d so the cafeteria forms ONE row of tables, not stacked rows.
        Slot("cafeteria_table", count=(0, 99), pattern="grid_fill",
             aisle_w=2, aisle_d=20),
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
        Slot("clock", count=(1, 1), wall="back", centered=True),
        Slot("desk", count=(1, 1), pattern="paired", pair_with="chair"),
        Slot("projector", count=(0, 1), on="desk"),
        Slot("globe", count=(0, 1), on="desk"),
        Slot("books_pile", count=(0, 1), on="desk"),
        Slot("microscope", count=(0, 1), on="desk"),
        Slot("student_desk", count=(0, 99), pattern="grid_fill",
             variants=(0, 1)),
        # Side walls: long banks of lockers, then maps, paintings,
        # bookshelves, radiators, coat racks pack the leftover anchors.
        Slot("locker", count=(2, 4), wall="side_a"),
        Slot("locker", count=(2, 4), wall="side_b"),
        Slot("map", count=(1, 2), wall="side_a", variants=(0, 1, 2)),
        Slot("map", count=(1, 2), wall="side_b", variants=(0, 1, 2)),
        Slot("painting", count=(2, 4), wall="side_a", variants=_PAINTING_VARIANTS),
        Slot("painting", count=(2, 4), wall="side_b", variants=_PAINTING_VARIANTS),
        Slot("bookshelf", count=(1, 2), wall="side_a"),
        Slot("bookshelf", count=(1, 2), wall="side_b"),
        Slot("coat_rack", count=(1, 2), wall="side_a"),
        Slot("coat_rack", count=(1, 2), wall="side_b"),
        Slot("radiator", count=(1, 2), wall="side_a"),
        Slot("radiator", count=(1, 2), wall="side_b"),
        # Back wall: more paintings, a bulletin, swiss flag, maybe a map.
        Slot("painting", count=(2, 4), wall="back", variants=_PAINTING_VARIANTS),
        Slot("bulletin_board", count=(1, 1), wall="back"),
        Slot("swiss_flag", count=(0, 1), wall="back"),
        Slot("map", count=(0, 1), wall="back", variants=(0, 1, 2)),
        # Front wall: paintings, cupboard, bulletin, occasional coat rack.
        Slot("painting", count=(2, 4), wall="front", variants=_PAINTING_VARIANTS),
        Slot("cupboard", count=(1, 2), wall="front"),
        Slot("bulletin_board", count=(0, 1), wall="front"),
        Slot("coat_rack", count=(0, 1), wall="front"),
        # Decor / clutter.
        Slot("plant", count=(1, 3)),
        Slot("trash_can", count=(1, 1)),
        Slot("backpack", count=(2, 4)),
        Slot("papers", count=(2, 4)),
    ],
    "teacher_room": [
        # Head teacher's desk anchored centrally against the back wall.
        Slot("desk", count=(1, 1), pattern="paired", pair_with="chair"),
        Slot("laptop", count=(1, 1), on="desk"),
        Slot("books_pile", count=(0, 1), on="desk"),
        # Back wall: paintings carpet the rest of the wall around the desk.
        # High count lets place_wall keep packing until the wall is full.
        Slot("painting", count=(6, 10), wall="back", variants=_PAINTING_VARIANTS),
        Slot("bulletin_board", count=(1, 2), wall="back"),
        Slot("swiss_flag", count=(1, 1), wall="back"),
        # side_a: full kitchenette / appliance row.
        Slot("fridge", count=(1, 1), wall="side_a"),
        Slot("coffee_machine", count=(2, 3), wall="side_a"),
        Slot("cupboard", count=(4, 8), wall="side_a"),
        Slot("painting", count=(4, 6), wall="side_a", variants=_PAINTING_VARIANTS),
        # side_b: full library wall — closets, bookshelves, radiators end-to-end.
        Slot("closet", count=(3, 6), wall="side_b"),
        Slot("bookshelf", count=(4, 8), wall="side_b"),
        Slot("radiator", count=(2, 3), wall="side_b"),
        Slot("painting", count=(4, 6), wall="side_b", variants=_PAINTING_VARIANTS),
        # Front wall (door wall): sofas + paintings + clock.
        Slot("sofa", count=(2, 3), wall="front"),
        Slot("painting", count=(4, 8), wall="front", variants=_PAINTING_VARIANTS),
        Slot("clock", count=(1, 1), wall="front", centered=True),
        Slot("bulletin_board", count=(0, 1), wall="front"),
        # Printer on its own side table.
        Slot("side_table", count=(1, 1)),
        Slot("printer", count=(1, 1), on="side_table"),
        # Decor / clutter.
        Slot("plant", count=(2, 3)),
        Slot("trash_can", count=(1, 1)),
        Slot("papers", count=(1, 3)),
    ],
    "toilet": [
        # BACK wall: ~70% toilet stalls then ~30% urinals, both contiguous
        # so they pack flush against each other. Toilet_stall is listed
        # FIRST so it claims anchors starting at 0; urinals fill the rest.
        # Counts are intentionally over-provisioned — place_wall returns
        # None once the wall is full and the surplus is silently dropped,
        # so the wall always packs as tight as the room size allows.
        Slot("toilet_stall", count=(14, 18), wall="back", contiguous=True),
        Slot("urinal", count=(10, 14), wall="back", contiguous=True),
        # SIDE_A: nothing but sinks, packed tight end-to-end.
        Slot("sink", count=(14, 20), wall="side_a", contiguous=True),
        # SIDE_B: radiators end-to-end, then paintings on whatever remains.
        Slot("radiator", count=(8, 12), wall="side_b", contiguous=True),
        Slot("painting", count=(4, 8), wall="side_b", variants=_PAINTING_VARIANTS),
        Slot("bookshelf", count=(0, 2), wall="side_b"),
        # FRONT wall (door wall): paintings + bulletin board.
        Slot("painting", count=(1, 3), wall="front", variants=_PAINTING_VARIANTS),
        Slot("bulletin_board", count=(0, 1), wall="front"),
        # Clutter.
        Slot("trash_can", count=(1, 2)),
        Slot("mop_bucket", count=(0, 1)),
        Slot("papers", count=(1, 3)),
    ],
    "gym": [
        Slot("basketball_hoop", count=(1, 1), wall="front", centered=True),
        Slot("basketball_hoop", count=(1, 1), wall="back", centered=True),
        Slot("gym_mat", count=(2, 5)),
        Slot("bench", count=(1, 2), wall="side_a"),
        Slot("bench", count=(1, 2), wall="side_b"),
        Slot("pylon", count=(3, 5)),
        Slot("closet", count=(1, 1), wall="front"),
        Slot("trash_can", count=(0, 1)),
    ],
    "janitor_room": [
        Slot("fuse_box", count=(1, 1), wall="back", centered=True),
        Slot("closet", count=(1, 2), wall="side_a"),
        Slot("mop_bucket", count=(2, 3)),
        Slot("recycle_bin", count=(2, 3)),
        Slot("trash_can", count=(0, 1)),
        Slot("papers", count=(1, 3)),
    ],
    "server_room": [
        # Server racks pack tight along W (rows of clusters) but leave
        # a 1m walkable aisle between rows on D so players can reach
        # each rack for the HDD-swap quest.
        Slot("server_rack", count=(0, 99), pattern="grid_fill",
             aisle_w=0, aisle_d=2, front_reserve=0),
        Slot("fire_extinguisher", count=(1, 1), wall="front", centered=True),
        Slot("pylon", count=(0, 1)),
    ],
}


# === Atrium: special-case Rect (not a Room), declared here for parity. ===
ATRIUM_INVENTORY: list[Slot] = [
    Slot("plant", count=(4, 6)),
    Slot("bench", count=(2, 3)),
    Slot("painting", count=(2, 3), variants=_PAINTING_VARIANTS),
]
