"""Single-prop placement helpers built on top of `RoomGrid`.

Each helper picks a legal sub-cell rect for a prop, reserves it, and
returns a world-space `Prop`. Returns `None` if no legal slot exists —
decorators handle that by skipping the prop, never by retrying with
overlap. Pattern placers (multi-prop layouts) live in `room_patterns.py`."""
from __future__ import annotations

import math
import random

from app.schemas.world import Prop
from app.world.prop_specs import SUB_CELL, PropSpec
from app.world.room_grid import ALL_WALLS, RoomGrid, Wall


CENTER_MARGIN_SUBCELLS = 4  # = 1 CELL_SIZE = 2m: outer-ring exclusion zone

# Distance from the wall plane to the prop's centre, in metres. With our
# wall-prop convention (frame at local z=+0.02, visible front extending to
# local -0.03..-0.08), this puts the back of the frame flush with the
# wall and leaves the visible front fully inside the room.
WALL_CLEARANCE = 0.02


def place_wall(
    grid: RoomGrid, prop_type: str, spec: PropSpec, wall: Wall,
    rng: random.Random, variant: int = 0, centered: bool = False,
    contiguous: bool = False,
) -> Prop | None:
    along, _ = spec.footprint
    axis_len = grid.w_cells if wall in ("front", "back") else grid.d_cells
    candidates = list(range(0, axis_len - along + 1))
    if centered:
        # Sort by distance from the wall's midpoint so the prop hugs the
        # centre, falling back outward only if the centre is taken.
        mid = (axis_len - along) / 2
        candidates.sort(key=lambda a: abs(a - mid))
    elif contiguous:
        # Iterate in order so successive placements naturally land on the
        # lowest free anchor — props end up flush against whatever was
        # placed before (no gaps, no interleave with other prop types).
        pass
    else:
        rng.shuffle(candidates)
    for anchor in candidates:
        w, d, sw, sd = grid.wall_rect(wall, anchor, spec)
        if not grid.is_free("floor", w, d, sw, sd):
            continue
        grid.mark("floor", w, d, sw, sd)
        # `offers_layer` is NOT marked here — that layer is the *available*
        # stacking surface this prop provides. Reservations on the offered
        # layer happen when a child (e.g. microwave) is placed via place_on.
        grid.reservations.append((prop_type, w, d, sw, sd, wall))
        # Push the prop's perpendicular axis flush against the wall plane
        # so the back of the prop touches the wall regardless of how many
        # sub-cells deep its footprint reservation is. The along-axis
        # stays at the sub-cell centre so positioning along the wall is
        # unchanged.
        if wall == "back":
            d_m = grid.frame.depth - WALL_CLEARANCE
            w_m = (w + sw / 2) * SUB_CELL - grid.frame.width / 2
        elif wall == "front":
            d_m = WALL_CLEARANCE
            w_m = (w + sw / 2) * SUB_CELL - grid.frame.width / 2
        elif wall == "side_a":
            d_m = (d + sd / 2) * SUB_CELL
            w_m = grid.frame.width / 2 - WALL_CLEARANCE
        else:  # side_b
            d_m = (d + sd / 2) * SUB_CELL
            w_m = -grid.frame.width / 2 + WALL_CLEARANCE
        cx, cz = grid.frame.place(d_m, w_m)
        return Prop(
            type=prop_type, x=cx, z=cz, yaw=grid.wall_yaw(wall), variant=variant,
        )
    return None


def place_any_wall(
    grid: RoomGrid, prop_type: str, spec: PropSpec, rng: random.Random,
    prefer: tuple[Wall, ...] = ALL_WALLS, variant: int = 0,
) -> Prop | None:
    order = list(prefer)
    rng.shuffle(order)
    for wall in order:
        p = place_wall(grid, prop_type, spec, wall, rng, variant=variant)
        if p is not None:
            return p
    return None


def place_center(
    grid: RoomGrid, prop_type: str, spec: PropSpec, rng: random.Random,
    margin: int = CENTER_MARGIN_SUBCELLS, yaw: float | None = None,
) -> Prop | None:
    """Centred placement, biased toward the room's middle. The outer 2m
    ring is OFF-LIMITS unless the room is too narrow to honour it (then
    `margin` clamps per-axis to whatever still leaves valid positions)."""
    along, out = spec.footprint
    eff_w = min(margin, max(0, (grid.w_cells - along) // 2))
    eff_d = min(margin, max(0, (grid.d_cells - out) // 2))
    ws = list(range(eff_w, grid.w_cells - along - eff_w + 1))
    ds = list(range(eff_d, grid.d_cells - out - eff_d + 1))
    if not ws or not ds:
        return None
    cx_room = (grid.w_cells - along) / 2
    cy_room = (grid.d_cells - out) / 2
    candidates = [(w, d) for w in ws for d in ds]
    candidates.sort(key=lambda wd: (
        (wd[0] - cx_room) ** 2 + (wd[1] - cy_room) ** 2 + rng.random() * 0.5
    ))
    final_yaw = yaw if yaw is not None else grid.frame.front_yaw + math.pi / 2
    for w, d in candidates:
        if not grid.is_free("floor", w, d, along, out):
            continue
        grid.mark("floor", w, d, along, out)
        grid.reservations.append((prop_type, w, d, along, out, "center"))
        cx, cz = grid.to_world(w + along / 2 - 0.5, d + out / 2 - 0.5)
        return Prop(type=prop_type, x=cx, z=cz, yaw=final_yaw)
    return None


def _axis_aligned_yaw(grid: RoomGrid, rng: random.Random) -> float:
    """Random yaw snapped to the room's cardinal axes. Free-floating props
    look uniformly wrong at arbitrary angles — snapping to 90° increments
    keeps tables/benches/plants parallel to the walls."""
    return grid.frame.front_yaw + rng.randint(0, 3) * (math.pi / 2)


def place_corner(
    grid: RoomGrid, prop_type: str, spec: PropSpec, rng: random.Random,
) -> Prop | None:
    along, out = spec.footprint
    # (corner, yaw-toward-room-interior). The yaw points the prop's local
    # -Z (its front) diagonally inward from its corner.
    diag = math.pi / 4
    front = grid.frame.front_yaw
    corners = [
        ((0, 0), front + diag),
        ((grid.w_cells - along, 0), front - diag),
        ((0, grid.d_cells - out), front + math.pi - diag),
        ((grid.w_cells - along, grid.d_cells - out), front + math.pi + diag),
    ]
    rng.shuffle(corners)
    for (w, d), yaw in corners:
        if not grid.is_free("floor", w, d, along, out):
            continue
        grid.mark("floor", w, d, along, out)
        grid.reservations.append((prop_type, w, d, along, out, "corner"))
        cx, cz = grid.to_world(w + along / 2 - 0.5, d + out / 2 - 0.5)
        return Prop(type=prop_type, x=cx, z=cz, yaw=yaw)
    return None


def place_floor(
    grid: RoomGrid, prop_type: str, spec: PropSpec, rng: random.Random,
    yaw: float | None = None,
) -> Prop | None:
    along, out = spec.footprint
    slots = [
        (w, d) for w in range(grid.w_cells - along + 1)
        for d in range(grid.d_cells - out + 1)
    ]
    rng.shuffle(slots)
    for w, d in slots:
        if not grid.is_free("floor", w, d, along, out):
            continue
        grid.mark("floor", w, d, along, out)
        grid.reservations.append((prop_type, w, d, along, out, "floor"))
        cx, cz = grid.to_world(w + along / 2 - 0.5, d + out / 2 - 0.5)
        return Prop(
            type=prop_type, x=cx, z=cz,
            yaw=yaw if yaw is not None else _axis_aligned_yaw(grid, rng),
        )
    return None


def place_on(
    grid: RoomGrid, prop_type: str, spec: PropSpec, parent_type: str,
    rng: random.Random,
) -> Prop | None:
    """Place on the next free spot on a `parent_type` prop's offered layer.
    Inherits the parent's wall yaw so the stacked prop faces the room.

    The stacked prop's world position uses the chosen sub-cell's centre
    on the parent's ALONG axis (so multiple stacks spread across left /
    centre / right of the parent) but stays at the parent's centre on
    the OUT axis (since the parent's mesh is often shallower than its
    reserved sub-cells)."""
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
