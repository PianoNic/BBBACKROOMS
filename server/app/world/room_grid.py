"""Sub-cell occupancy grid for placing props inside a room without overlap.

The room is divided into `SUB_CELL` (0.5m) sub-cells along its (width,
depth) axes. Every reservation marks the cells its footprint covers on
the relevant layer (`floor`, `counter_top`, …). Wall labels follow the
frame convention: `front` (door wall, d=0), `back` (opposite, d=last),
`side_a` (+w), `side_b` (-w)."""
from __future__ import annotations

import math
from typing import Literal

from app.world.frame import Frame, make_frame
from app.world.layout import Room
from app.world.prop_specs import SUB_CELL, PropSpec

Wall = Literal["front", "back", "side_a", "side_b"]
ALL_WALLS: tuple[Wall, ...] = ("front", "back", "side_a", "side_b")

# Sub-cell radius around the doorway that must stay clear.
DOOR_CLEAR_R = 2


# A reservation: (prop_type, w_start, d_start, w_size, d_size, wall_label).
# `wall_label` is one of ALL_WALLS for wall placements, "center"/"corner"/
# "floor" otherwise — used by `try_place_on` to pair a stacked prop with
# its parent's wall yaw.
Reservation = tuple[str, int, int, int, int, str]


class RoomGrid:
    """Reservable grid for one room. Pure occupancy + coord conversion;
    the high-level `try_place_*` helpers live in `room_placer.py`."""

    def __init__(self, room: Room) -> None:
        self.room = room
        self.frame: Frame = make_frame(room)
        self.w_cells = max(1, int(self.frame.width / SUB_CELL))
        self.d_cells = max(1, int(self.frame.depth / SUB_CELL))
        self._layers: dict[str, list[list[bool]]] = {
            "floor": [[False] * self.d_cells for _ in range(self.w_cells)],
        }
        self.reservations: list[Reservation] = []

    def layer(self, name: str) -> list[list[bool]]:
        layer = self._layers.get(name)
        if layer is None:
            layer = [[False] * self.d_cells for _ in range(self.w_cells)]
            self._layers[name] = layer
        return layer

    def is_free(self, layer: str, w: int, d: int, sw: int, sd: int) -> bool:
        if w < 0 or d < 0 or w + sw > self.w_cells or d + sd > self.d_cells:
            return False
        grid = self.layer(layer)
        for i in range(w, w + sw):
            for j in range(d, d + sd):
                if grid[i][j]:
                    return False
        return True

    def mark(self, layer: str, w: int, d: int, sw: int, sd: int) -> None:
        grid = self.layer(layer)
        for i in range(w, w + sw):
            for j in range(d, d + sd):
                grid[i][j] = True

    def to_world(self, w_center: float, d_center: float) -> tuple[float, float]:
        wm = (w_center + 0.5) * SUB_CELL - self.frame.width / 2
        dm = (d_center + 0.5) * SUB_CELL
        return self.frame.place(dm, wm)

    def wall_rect(
        self, wall: Wall, anchor: int, spec: PropSpec,
    ) -> tuple[int, int, int, int]:
        along, out = spec.footprint
        if wall == "front":
            return (anchor, 0, along, out)
        if wall == "back":
            return (anchor, self.d_cells - out, along, out)
        if wall == "side_b":
            return (0, anchor, out, along)
        return (self.w_cells - out, anchor, out, along)

    def wall_yaw(self, wall: Wall) -> float:
        f = self.frame
        if wall == "front":
            return f.front_yaw
        if wall == "back":
            return f.front_yaw + math.pi
        if wall == "side_a":
            return f.side_a_yaw
        return f.side_b_yaw

    def reserve_door_clearance(self) -> None:
        """Block the doorway tile + a small fan-out into the room so no
        decorator can drop a prop in front of the entrance."""
        door_w_metres = self.frame.door_w + self.frame.width / 2
        center = int(door_w_metres / SUB_CELL)
        floor = self.layer("floor")
        for i in range(center - DOOR_CLEAR_R, center + DOOR_CLEAR_R + 1):
            if 0 <= i < self.w_cells:
                for j in range(0, min(DOOR_CLEAR_R + 1, self.d_cells)):
                    floor[i][j] = True
