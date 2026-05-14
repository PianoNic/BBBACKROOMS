"""Single entry point that turns an inventory declaration into world props.

`decorate_room(room, rng)` looks up the room's archetype in `INVENTORIES`,
walks each `Slot`, and dispatches to the right `room_placer` helper. The
grid keeps occupancy sane; failures (no free slot) are silent — the slot
is just not filled, which is always preferable to overlap."""
from __future__ import annotations

import random

from app.schemas.world import Prop
from app.world.inventories import (
    ATRIUM_INVENTORY, INVENTORIES, Slot,
)
from app.world.layout import Rect, Room
from app.world.prop_specs import get as get_spec
from app.world.room_grid import RoomGrid, SUB_CELL
from app.world.room_patterns import place_grid_fill, place_paired
from app.world.room_placer import (
    place_any_wall, place_center, place_corner, place_floor, place_on,
    place_wall,
)


# Debug side-channel: every call to decorate_room/decorate_atrium appends
# its grid here so visualisers can show the actual reservations from the
# real generation pass. Production code ignores this list.
LAST_GRIDS: list[RoomGrid] = []


def reset_grid_capture() -> None:
    LAST_GRIDS.clear()


def decorate_room(room: Room, rng: random.Random) -> list[Prop]:
    inventory = INVENTORIES.get(room.archetype, [])
    grid = RoomGrid(room)
    grid.reserve_door_clearance()
    out: list[Prop] = []
    for slot in inventory:
        out.extend(_place_slot(grid, slot, rng))
    LAST_GRIDS.append(grid)
    return out


def _place_slot(
    grid: RoomGrid, slot: Slot, rng: random.Random,
) -> list[Prop]:
    spec = get_spec(slot.type)
    # Patterns ignore count semantics — they fill as much as fits.
    if slot.pattern == "grid_fill":
        # Bigger aisle (2 sub-cells) keeps the prop count manageable —
        # student-desk and server-rack patterns no longer carpet the
        # entire room interior at sub-cell density.
        return place_grid_fill(
            grid, slot.type, spec, rng, front_reserve=4, aisle=2,
        )
    lo, hi = slot.count
    n = rng.randint(lo, hi) if hi >= lo else 0
    placed: list[Prop] = []
    for _ in range(n):
        variant = rng.choice(slot.variants)
        p = _place_one(grid, slot, spec, rng, variant)
        if p is None:
            continue
        if isinstance(p, tuple):
            placed.extend(x for x in p if x is not None)
        else:
            placed.append(p)
    return placed


def _place_one(
    grid: RoomGrid, slot: Slot, spec, rng: random.Random, variant: int,
):
    if slot.pattern == "paired" and slot.pair_with:
        partner_spec = get_spec(slot.pair_with)
        return place_paired(
            grid, slot.type, spec, slot.pair_with, partner_spec, rng,
        )
    placement = spec.placement
    if placement == "wall":
        if slot.wall is not None:
            return place_wall(grid, slot.type, spec, slot.wall, rng,
                              variant=variant, centered=slot.centered)
        return place_any_wall(grid, slot.type, spec, rng, variant=variant)
    if placement == "center":
        return place_center(grid, slot.type, spec, rng)
    if placement == "corner":
        return place_corner(grid, slot.type, spec, rng)
    if placement == "on_top":
        if slot.on is None:
            return None
        return place_on(grid, slot.type, spec, slot.on, rng)
    return place_floor(grid, slot.type, spec, rng)


def decorate_atrium(atrium: Rect, rng: random.Random) -> list[Prop]:
    """Atrium uses the same inventory system via a synthetic Room. The
    atrium has 4 exits (one per wall mid-point) — we pre-block a band of
    sub-cells around each midpoint so nothing lands in the corridor."""
    synth_room = Room(
        rect=atrium, archetype="atrium", front_dir="N", door_w=0.0,
        door_x=(atrium.x + atrium.w / 2) * 2.0,
        door_z=atrium.y * 2.0,
    )
    grid = RoomGrid(synth_room)
    _reserve_atrium_openings(grid)
    out: list[Prop] = []
    for slot in ATRIUM_INVENTORY:
        out.extend(_place_slot(grid, slot, rng))
    LAST_GRIDS.append(grid)
    return out


def _reserve_atrium_openings(grid: RoomGrid) -> None:
    """Block a 3-wide band at the middle of each of the 4 walls."""
    band = 3
    cw, cd = grid.w_cells // 2, grid.d_cells // 2
    for j in range(grid.d_cells):
        for off in range(-band, band + 1):
            i = cw + off
            if 0 <= i < grid.w_cells:
                grid.layer("floor")[i][j] = True if (j < band or j >= grid.d_cells - band) else grid.layer("floor")[i][j]
    for i in range(grid.w_cells):
        for off in range(-band, band + 1):
            j = cd + off
            if 0 <= j < grid.d_cells:
                grid.layer("floor")[i][j] = True if (i < band or i >= grid.w_cells - band) else grid.layer("floor")[i][j]
    # Always block the central opening cross too (so nothing lands in
    # the literal middle of the atrium walking lanes).
    for j in range(cd - band, cd + band + 1):
        for i in range(cw - band, cw + band + 1):
            if 0 <= i < grid.w_cells and 0 <= j < grid.d_cells:
                grid.layer("floor")[i][j] = True


_ = SUB_CELL  # re-export silenced
