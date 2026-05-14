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

    The stacked prop's world position uses the chosen sub-cell's centre
    on the parent's ALONG axis (so multiple stacks spread across left /
    centre / right of the parent) but stays at the parent's centre on
    the OUT axis (the parent mesh is often shallower than its reserved
    sub-cells)."""
    parents = [r for r in grid.reservations if r[0] == parent_type]
    rng.shuffle(parents)
    for _, pw, pd, psw, psd, wall in parents:
        along, out = spec.footprint
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
                pw + dw + along / 2 - 0.5,
                pd + psd / 2 - 0.5,
            )
            yaw = grid.wall_yaw(wall) if wall in ALL_WALLS else 0.0
            return Prop(type=prop_type, x=cx, z=cz, yaw=yaw)
    return None
