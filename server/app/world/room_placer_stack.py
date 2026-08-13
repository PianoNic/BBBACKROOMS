"""Stacking placement: drop a prop ON a parent's offered surface
(e.g. microwave on counter, projector on desk). Inherits the parent's
wall yaw so the stacked prop still faces the room."""
from __future__ import annotations

import random

from app.schemas.world import Prop
from app.world.prop_specs import PropSpec
from app.world.room_grid import ALL_WALLS, RoomGrid


def place_on(
    grid: RoomGrid, prop_type: str, spec: PropSpec, parent_type: str,
    rng: random.Random,
) -> Prop | None:
    """Place on the next free spot on a `parent_type` prop's offered layer.

    The world position is the centre of the sub-cells actually reserved, on
    both axes. Using the parent's centre on the OUT axis instead — as this
    did — meant two props that reserved different slots still rendered on the
    same line and clipped through each other.

    Reading the reservation back keeps geometry and occupancy in agreement.
    Any overhang past a parent mesh shallower than its footprint is bounded
    by half a sub-cell (0.25 m), since footprints are the mesh rounded up to
    the sub-cell grid."""
    parents = [r for r in grid.reservations if r[0] == parent_type]
    rng.shuffle(parents)
    for _, pw, pd, psw, psd, wall in parents:
        along, out = spec.footprint
        # The parent's own extents were swapped into grid space by
        # `wall_rect` when it sits on a side wall; the child has to be
        # measured the same way or its footprint is a quarter-turn off the
        # surface it is standing on, and two props on one counter collide.
        if wall in ("side_a", "side_b"):
            along, out = out, along
        offsets = [
            (dw, dd)
            for dw in range(psw - along + 1)
            for dd in range(psd - out + 1)
        ]
        rng.shuffle(offsets)
        for dw, dd in offsets:
            w, d = pw + dw, pd + dd
            if not grid.is_free(spec.requires_layer, w, d, along, out):
                continue
            grid.mark(spec.requires_layer, w, d, along, out)
            grid.reservations.append((prop_type, w, d, along, out, wall))
            cx, cz = grid.to_world(
                w + along / 2 - 0.5,
                d + out / 2 - 0.5,
            )
            yaw = grid.wall_yaw(wall) if wall in ALL_WALLS else 0.0
            return Prop(type=prop_type, x=cx, z=cz, yaw=yaw)
    return None
