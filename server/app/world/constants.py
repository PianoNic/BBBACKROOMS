"""Tunable knobs for worldgen. All sizes in cells unless noted."""

CELL_SIZE = 2.0  # world units per cell

# Admin-selectable map sizes (cells per side, square).
MAP_SIZES = {
    "small": 60,
    "medium": 120,
    "large": 180,
}
DEFAULT_MAP_CELLS = MAP_SIZES["medium"]

HALL_THICKNESS = 2
CLASSROOM_DEPTH_MIN = 4
CLASSROOM_DEPTH_MAX = 7
CLASSROOM_WIDTH_MIN = 5
CLASSROOM_WIDTH_MAX = 9
MARGIN = 2

HALL_LIGHT_SPACING = 3
