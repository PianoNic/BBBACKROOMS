"""Floor plan generation: rooms-first, corridors-second, 2-wide corridors.

Algorithm overview:
  1. Paint an atrium in the centre as CORRIDOR.
  2. BFS-place rooms outward with at least 4 EMPTY cells between any two
     (`_rooms` module).
  3. Pick one door per room on the side with most breathing space
     (`_rooms` module).
  4. Build MST over 2x2 approach blocks; carve 2-wide corridors via A*
     (`_corridors` module).
  5. Erase rooms / corridor stubs that the MST couldn't connect.
"""
from app.world.layout._build import build_layout
from app.world.layout._types import (
    CORRIDOR,
    DOOR,
    EMPTY,
    ROOM,
    Direction,
    Layout,
    Rect,
    Room,
)

__all__ = [
    "build_layout",
    "CORRIDOR",
    "DOOR",
    "EMPTY",
    "ROOM",
    "Direction",
    "Layout",
    "Rect",
    "Room",
]
