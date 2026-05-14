"""Multi-prop pattern placers — coordinated layouts of several Props.

`room_placer.py` covers single-prop placement (one Prop per call).
Patterns produce 1..N Props in a coordinated arrangement: a grid of
student desks, or a desk paired with its chair just in front of it.
Each pattern still goes through the same `RoomGrid` so collisions with
other inventory items are impossible by construction."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.prop_specs import PropSpec
from app.world.room_grid import RoomGrid
from app.world.room_placer import CENTER_MARGIN_SUBCELLS, place_center


def place_grid_fill(
    grid: RoomGrid, prop_type: str, spec: PropSpec, rng: random.Random,
    front_reserve: int = 0, aisle: int = 1, yaw: float | None = None,
) -> list[Prop]:
    """Fill the room (minus a front reserve band) with a regular grid of
    this prop. The outer 2m ring is excluded so rows don't hug the
    side/back walls. Sub-cells already taken are skipped silently — the
    pattern adapts around wall props."""
    along, out = spec.footprint
    use_yaw = yaw if yaw is not None else grid.frame.front_yaw
    pitch_w = along + aisle
    pitch_d = out + aisle
    margin_w = min(CENTER_MARGIN_SUBCELLS,
                   max(0, (grid.w_cells - along) // 2))
    margin_d = min(CENTER_MARGIN_SUBCELLS,
                   max(0, (grid.d_cells - out) // 2))
    d_start = max(front_reserve, margin_d)
    d_stop = grid.d_cells - out - margin_d + 1
    w_start = margin_w
    w_stop = grid.w_cells - along - margin_w + 1
    placed: list[Prop] = []
    for d in range(d_start, d_stop, pitch_d):
        for w in range(w_start, w_stop, pitch_w):
            if not grid.is_free("floor", w, d, along, out):
                continue
            grid.mark("floor", w, d, along, out)
            grid.reservations.append((prop_type, w, d, along, out, "center"))
            cx, cz = grid.to_world(w + along / 2 - 0.5, d + out / 2 - 0.5)
            placed.append(Prop(type=prop_type, x=cx, z=cz, yaw=use_yaw))
    return placed


def place_paired(
    grid: RoomGrid, primary_type: str, primary_spec: PropSpec,
    partner_type: str, partner_spec: PropSpec, rng: random.Random,
) -> tuple[Prop, Prop | None] | None:
    """Teacher's desk anchored centrally against the BACK wall (opposite
    the door, where the whiteboard sits), facing the students. The chair
    sits between the desk and the back wall so the teacher faces forward.
    Falls back to a free-form centre placement if there's no room
    against the back wall (very narrow rooms)."""
    primary = _place_back_centred(grid, primary_type, primary_spec)
    if primary is None:
        primary = place_center(
            grid, primary_type, primary_spec, rng,
            yaw=grid.frame.front_yaw + math.pi,
        )
    if primary is None:
        return None
    _, pw, pd, psw, psd, _ = grid.reservations[-1]
    pa_along, pa_out = partner_spec.footprint
    # Chair sits behind the desk and the teacher faces the students /
    # door. The chair builder has the sitter facing +Z at yaw=0, and
    # `front_yaw` is the rotation that turns local -Z into the
    # door-pointing direction → applying it to the chair turns its
    # local +Z away from the door, i.e. the sitter faces the door.
    chair_yaw = grid.frame.front_yaw
    centre_w = pw + (psw - pa_along) // 2
    margin_w = min(CENTER_MARGIN_SUBCELLS,
                   max(0, (grid.w_cells - pa_along) // 2))
    margin_d = min(CENTER_MARGIN_SUBCELLS,
                   max(0, (grid.d_cells - pa_out) // 2))
    # Preferred: chair behind desk (between desk and back wall, large d).
    # Fallback: chair in front of desk (towards the students) for rooms
    # too shallow to fit one behind.
    for w, d in [(centre_w, pd + psd), (centre_w, pd - pa_out)]:
        if w < margin_w or w + pa_along > grid.w_cells - margin_w:
            continue
        if d < 0 or d + pa_out > grid.d_cells:
            continue
        # Allow the chair to sit in the back-wall margin band (it's part
        # of the desk grouping, not a free-floating prop).
        if d < margin_d and d + pa_out <= margin_d:
            continue
        if not grid.is_free("floor", w, d, pa_along, pa_out):
            continue
        grid.mark("floor", w, d, pa_along, pa_out)
        grid.reservations.append(
            (partner_type, w, d, pa_along, pa_out, "floor"),
        )
        cx, cz = grid.to_world(
            w + pa_along / 2 - 0.5, d + pa_out / 2 - 0.5,
        )
        return primary, Prop(type=partner_type, x=cx, z=cz, yaw=chair_yaw)
    return primary, None


def _place_back_centred(
    grid: RoomGrid, prop_type: str, spec: PropSpec,
) -> Prop | None:
    """Reserve a slot centred along the w-axis and snug against the back
    wall (d = d_cells-1). Leaves one sub-cell gap so the desk doesn't
    visually fuse with the whiteboard. Yaw faces the students."""
    along, out = spec.footprint
    if along > grid.w_cells or out >= grid.d_cells:
        return None
    margin_w = min(CENTER_MARGIN_SUBCELLS,
                   max(0, (grid.w_cells - along) // 2))
    centre_w = (grid.w_cells - along) // 2
    # Leave at least 2 sub-cells between the desk and the back wall so
    # the chair can sit BEHIND the desk (between desk and whiteboard)
    # with the teacher facing the students. We try gaps 2, 3, 4 first,
    # then fall back to 1 and 0 if the room is too shallow.
    d_offsets = [2, 3, 4, 1, 0]
    w_offsets = [0, -1, 1, -2, 2]
    yaw = grid.frame.front_yaw + math.pi
    for d_off in d_offsets:
        d = grid.d_cells - out - d_off
        if d < 0:
            continue
        for dw in w_offsets:
            w = centre_w + dw
            if w < margin_w or w + along > grid.w_cells - margin_w:
                continue
            if not grid.is_free("floor", w, d, along, out):
                continue
            grid.mark("floor", w, d, along, out)
            # Tag the reservation with "back" so stacked props (projector
            # on the desk, etc.) inherit the back-wall yaw via place_on.
            grid.reservations.append(
                (prop_type, w, d, along, out, "back"),
            )
            cx, cz = grid.to_world(
                w + along / 2 - 0.5, d + out / 2 - 0.5,
            )
            return Prop(type=prop_type, x=cx, z=cz, yaw=yaw)
    return None
