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


# Defaults are tuned for the existing visuals — see propBuilders/*.ts for
# the actual mesh extents that motivated each footprint.
PROP_SPECS: dict[str, PropSpec] = {
    # === Wall-mounted / wall-adjacent furniture ===
    "whiteboard":        PropSpec((6, 1), _WALL),
    "vending_machine":   PropSpec((2, 2), _WALL),
    "coffee_machine":    PropSpec((2, 2), _WALL),
    "counter":           PropSpec((4, 2), _WALL, offers_layer="counter_top"),
    "sink":              PropSpec((2, 2), _WALL),
    "urinal":            PropSpec((2, 2), _WALL),
    "toilet_stall":      PropSpec((2, 2), _WALL),
    "bookshelf":         PropSpec((2, 1), _WALL),
    "cupboard":          PropSpec((3, 1), _WALL),
    "closet":            PropSpec((2, 1), _WALL),
    "locker":            PropSpec((1, 1), _WALL),
    "radiator":          PropSpec((3, 1), _WALL),
    "fuse_box":          PropSpec((2, 1), _WALL),
    "bulletin_board":    PropSpec((3, 1), _WALL),
    "painting":          PropSpec((2, 1), _WALL),
    "swiss_flag":        PropSpec((2, 1), _WALL),
    "clock":             PropSpec((1, 1), _WALL),
    "exit_sign":         PropSpec((1, 1), _WALL),
    "bench":             PropSpec((4, 1), _WALL),
    "server_rack":       PropSpec((2, 2), _WALL),
    "basketball_hoop":   PropSpec((3, 1), _WALL),

    # === On-top: requires a parent's offered layer ===
    "microwave":         PropSpec((1, 1), _ONTOP, requires_layer="counter_top"),
    "laptop":            PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),
    "globe":             PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),
    "books_pile":        PropSpec((1, 1), _ONTOP, requires_layer="desk_top"),

    # === Center: must have wall clearance ===
    "cafeteria_table":   PropSpec((5, 2), _CENTER),
    "student_desk":      PropSpec((2, 2), _CENTER),
    "gym_mat":           PropSpec((4, 2), _CENTER),
    "desk":              PropSpec((3, 2), _CENTER, offers_layer="desk_top"),

    # === Corner-only props ===
    "plant":             PropSpec((1, 1), _CORNER),

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
