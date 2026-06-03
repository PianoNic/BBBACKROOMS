"""Footprint + placement rules for every prop type.

A `PropSpec` declares:
- `footprint`: (along_wall, out_from_wall) in 0.5m sub-cells. For non-wall
  placements `along` is the w-axis size and `out` is the d-axis size.
- `placement`: where in a room the prop is allowed to land.
- `offers_layer` / `requires_layer`: enables stacking (microwave on counter).

The `RoomGrid` uses these to reserve occupancy and pick legal slots."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Placement = Literal["wall", "corner", "center", "floor", "on_top"]

SUB_CELL = 0.5  # metres per sub-cell


@dataclass(frozen=True)
class PropSpec:
    footprint: tuple[int, int]            # (along, out) sub-cells
    placement: Placement
    offers_layer: str = ""                # e.g. "counter_top"
    requires_layer: str = ""              # e.g. "counter_top"


_WALL = "wall"
_CENTER = "center"
_CORNER = "corner"
_FLOOR = "floor"
_ONTOP = "on_top"


# Footprints are derived from the actual client mesh extents in
# propBuilders/*.ts (and gameplay/lockers.ts), rounded UP to the
# 0.5m sub-cell grid. Keep in sync when meshes change.
PROP_SPECS: dict[str, PropSpec] = {
    # === Wall-mounted / wall-adjacent furniture ===
    # whiteboard: WB_FRAME 2.6 x 0.04 → 6 x 1
    "whiteboard":        PropSpec((6, 1), _WALL),
    # vending_machine: body 1.0 x 0.65 → 2 x 2
    "vending_machine":   PropSpec((2, 2), _WALL),
    # coffee_machine: base 0.6 x 0.45 → 2 x 1
    "coffee_machine":    PropSpec((2, 1), _WALL),
    # counter: top 1.85 x 0.70 → 4 x 2
    "counter":           PropSpec((4, 2), _WALL, offers_layer="counter_top"),
    # sink: body 0.6 x 0.4 → 2 x 1
    "sink":              PropSpec((2, 1), _WALL),
    # urinal: bowl 0.34 x ~0.30 → 1 x 1
    "urinal":            PropSpec((1, 1), _WALL),
    # toilet_stall: shell 1.0 x 1.0 → 2 x 2
    "toilet_stall":      PropSpec((2, 2), _WALL),
    # bookshelf: body 1.2 x 0.35 → 3 x 1
    "bookshelf":         PropSpec((3, 1), _WALL),
    # cupboard: body 1.2 x 0.5 → 3 x 1
    "cupboard":          PropSpec((3, 1), _WALL),
    # closet: body 0.8 x 0.45 → 2 x 1
    "closet":            PropSpec((2, 1), _WALL),
    # locker: W=0.5 D=0.4 → 1 x 1
    "locker":            PropSpec((1, 1), _WALL),
    # radiator: body 1.5 x 0.18 → 3 x 1
    "radiator":          PropSpec((3, 1), _WALL),
    # fuse_box: 0.55 x 0.15 → 2 x 1
    "fuse_box":          PropSpec((2, 1), _WALL),
    # bulletin_board: 1.10 x 0.04 → 3 x 1
    "bulletin_board":    PropSpec((3, 1), _WALL),
    # painting: 0.72 x 0.04 → 2 x 1
    "painting":          PropSpec((2, 1), _WALL),
    # swiss_flag: 0.5 x 0.05 → 1 x 1
    "swiss_flag":        PropSpec((1, 1), _WALL),
    # clock: rim r=0.22 (diam 0.44) → 1 x 1
    "clock":             PropSpec((1, 1), _WALL),
    "exit_sign":         PropSpec((1, 1), _WALL),
    # bench: seat 1.5 x 0.4 → 3 x 1
    "bench":             PropSpec((3, 1), _WALL),
    # server_rack: renders TWO racks side by side in a single row.
    # Combined ~1.9m x ~0.85m → footprint 4 x 2.
    "server_rack":       PropSpec((4, 2), _WALL),
    # basketball_hoop: board 1.05 x 0.05, ring extends to z=-0.42 → 3 x 1
    "basketball_hoop":   PropSpec((3, 1), _WALL),

    # === On-top: requires a parent's offered layer ===
    # microwave: body 0.55 x 0.40 → 2 x 1. Stacks on a counter (wall prop)
    # so microwaves always end up along a wall, never floating in the middle.
    "microwave":         PropSpec((2, 1), _ONTOP, requires_layer="counter_top"),
    "laptop":            PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),
    "globe":             PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),
    "books_pile":        PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),

    # === Center: must have wall clearance ===
    # cafeteria_table: top 2.2 x 0.7 + benches dz±0.55 (z extent 1.38) → 5 x 3
    "cafeteria_table":   PropSpec((5, 3), _CENTER),
    # student_desk: top 0.7 + seat+back to z=0.75 (z extent 1.0) → 2 x 2
    "student_desk":      PropSpec((2, 2), _CENTER),
    # gym_mat: 1.8 x 0.9 → 4 x 2
    "gym_mat":           PropSpec((4, 2), _CENTER),
    # desk: top 2.0 x 0.6 → 4 x 2
    "desk":              PropSpec((4, 2), _CENTER, offers_layer="desk_top"),

    # === Corner-only props ===
    # plant: foliage r=0.32 (diam 0.64) → 2 x 2
    "plant":             PropSpec((2, 2), _CORNER),

    # side_table: small 1m x 1m table, offers a layer for stacking props.
    "side_table":        PropSpec((2, 2), _CENTER, offers_layer="table_top"),
    # printer: 0.55 x 0.5 body, stacks on a side_table's table_top layer.
    "printer":           PropSpec((1, 1), _ONTOP, requires_layer="table_top"),
    # map: wall poster (world / Switzerland / periodic). 0.85m wide.
    "map":               PropSpec((2, 1), _WALL),
    # chalkboard: alternative to whiteboard for back wall.
    "chalkboard":        PropSpec((5, 1), _WALL),
    # coat_rack: tall wall stand with hooks, ~0.6m wide.
    "coat_rack":         PropSpec((2, 1), _WALL),
    # microscope: small desk_top instrument.
    "microscope":        PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),
    # fridge: 0.7 x 0.7 body, 1.7 tall → 2 x 2 (wall)
    "fridge":            PropSpec((2, 2), _WALL),
    # sofa: 1.8 x 0.85 → 4 x 2 (wall, faces room)
    "sofa":              PropSpec((4, 2), _WALL),

    # === Floor: no wall constraint, can land in walking lanes ===
    "chair":             PropSpec((1, 1), _FLOOR),
    "trash_can":         PropSpec((1, 1), _FLOOR),
    "recycle_bin":       PropSpec((1, 1), _FLOOR),
    "mop_bucket":        PropSpec((1, 1), _FLOOR),
    "pylon":             PropSpec((1, 1), _FLOOR),
    "backpack":          PropSpec((1, 1), _FLOOR),
    "papers":            PropSpec((1, 1), _FLOOR),
    "fire_extinguisher": PropSpec((1, 1), _WALL),
    "floor_lamp":        PropSpec((1, 1), _FLOOR),
    "projector":         PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),
}


def get(prop_type: str) -> PropSpec:
    """Returns the spec or raises KeyError. Decorators MUST use registered
    prop types — this is the contract that keeps the placement grid safe."""
    return PROP_SPECS[prop_type]
