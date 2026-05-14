"""Render a generated world as a PNG with full labels + legend.

Layers (bottom → top):
  1. Tile background — corridor / room / atrium / door / void.
  2. Sub-cell occupancy overlay — every prop footprint shaded by category.
  3. Prop centres (small dot per prop).
  4. Prop type labels next to each dot.
  5. Two legends — placement category + room-archetype.

Run:   PYTHONPATH=. python tools/visualize_world.py [seed] [size]
       size = world width/height in cells (default 60). Try 120 or 180.
Output: tools/world.png
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.world.constants import CELL_SIZE
from app.world import decorator as _dec_mod
from app.world.generator import generate
from app.world.prop_specs import SUB_CELL, get as get_spec
from app.world.room_grid import RoomGrid

PIXELS_PER_METRE = 8
PAD_CELLS = 4  # blank border around the grid so the red boundary is visible
GRID_LINE_COLOR = (255, 255, 255, 28)
SUB_GRID_LINE_COLOR = (255, 255, 255, 18)

# --- Palette ---------------------------------------------------------
TILE_VOID = (16, 16, 18)
TILE_CORRIDOR = (60, 60, 70)
TILE_ATRIUM = (50, 80, 100)
TILE_DOOR = (220, 200, 80)
ARCHETYPE_TILE = {
    "classroom":     (90, 70, 40),
    "teacher_room":  (90, 50, 70),
    "toilet":        (40, 80, 90),
    "gym":           (50, 90, 50),
    "cafeteria":     (180, 130, 50),
    "janitor_room":  (90, 60, 60),
    "server_room":   (40, 40, 80),
}
CATEGORY_FILL = {
    "wall":   (220, 220, 220, 130),
    "center": (120, 200, 255, 130),
    "corner": (200, 120, 255, 130),
    "floor":  (255, 200, 100, 130),
    "on_top": (255, 120, 120, 180),
}
CATEGORY_DOT = {
    "wall":   (255, 255, 255),
    "center": (140, 220, 255),
    "corner": (220, 140, 255),
    "floor":  (255, 220, 140),
    "on_top": (255, 140, 140),
}

LABEL_FONT_PATH = "C:/Windows/Fonts/arial.ttf"


def _font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(LABEL_FONT_PATH, size)
    except OSError:
        return ImageFont.load_default()


def _placement_of(prop_type: str) -> str:
    try:
        return get_spec(prop_type).placement
    except KeyError:
        return "floor"


# --- Renderers -------------------------------------------------------

def _tile_layer_off(
    draw: ImageDraw.ImageDraw, layout, px_per_cell: int, off: int,
) -> None:
    for y in range(layout.height):
        for x in range(layout.width):
            if layout.cells[y * layout.width + x] == 0:
                continue
            draw.rectangle(
                [off + x * px_per_cell, off + y * px_per_cell,
                 off + (x + 1) * px_per_cell - 1,
                 off + (y + 1) * px_per_cell - 1],
                fill=TILE_CORRIDOR,
            )
    for room in layout.rooms:
        col = ARCHETYPE_TILE.get(room.archetype, ARCHETYPE_TILE["classroom"])
        r = room.rect
        draw.rectangle(
            [off + r.x * px_per_cell, off + r.y * px_per_cell,
             off + (r.x + r.w) * px_per_cell - 1,
             off + (r.y + r.h) * px_per_cell - 1],
            fill=col,
        )
    if layout.atrium is not None:
        a = layout.atrium
        draw.rectangle(
            [off + a.x * px_per_cell, off + a.y * px_per_cell,
             off + (a.x + a.w) * px_per_cell - 1,
             off + (a.y + a.h) * px_per_cell - 1],
            fill=TILE_ATRIUM,
        )
    for dx, dz in layout.doors:
        cx, cy = off + int(dx * PIXELS_PER_METRE), off + int(dz * PIXELS_PER_METRE)
        draw.rectangle([cx - 3, cy - 3, cx + 3, cy + 3], fill=TILE_DOOR)


def _draw_grid_lines(
    draw, layout, px_per_cell: int, off: int, color, step_cells: int, width: int,
) -> None:
    """Draw cell-grid lines across the bitmap area."""
    total_w = layout.width * px_per_cell
    total_h = layout.height * px_per_cell
    step = step_cells * px_per_cell
    for x in range(0, total_w + 1, step):
        draw.line([(off + x, off), (off + x, off + total_h)], fill=color, width=width)
    for y in range(0, total_h + 1, step):
        draw.line([(off, off + y), (off + total_w, off + y)], fill=color, width=width)


def _draw_subgrid_lines(draw, grids, off: int) -> None:
    """Draw sub-cell grid lines inside every room. One sub-cell = 0.5m."""
    sub_px = int(SUB_CELL * PIXELS_PER_METRE)
    for grid in grids:
        f = grid.frame
        # Sub-cell corner walk in room-local space → world coords.
        for w in range(grid.w_cells + 1):
            wm = w * SUB_CELL - f.width / 2
            x0, z0 = f.place(0.0, wm)
            x1, z1 = f.place(grid.d_cells * SUB_CELL, wm)
            draw.line(
                [(off + int(x0 * PIXELS_PER_METRE), off + int(z0 * PIXELS_PER_METRE)),
                 (off + int(x1 * PIXELS_PER_METRE), off + int(z1 * PIXELS_PER_METRE))],
                fill=SUB_GRID_LINE_COLOR, width=1,
            )
        for d in range(grid.d_cells + 1):
            dm = d * SUB_CELL
            x0, z0 = f.place(dm, -f.width / 2)
            x1, z1 = f.place(dm, f.width / 2)
            draw.line(
                [(off + int(x0 * PIXELS_PER_METRE), off + int(z0 * PIXELS_PER_METRE)),
                 (off + int(x1 * PIXELS_PER_METRE), off + int(z1 * PIXELS_PER_METRE))],
                fill=SUB_GRID_LINE_COLOR, width=1,
            )
    _ = sub_px


def _overlay_all(draw, grids, off: int) -> None:
    for grid in grids:
        _overlay_reservations_off(draw, grid, off)


def _draw_room_boundaries_off(
    draw, layout, px_per_cell: int, off: int,
) -> None:
    # Red bitmap boundary (full GRID_W × GRID_H square).
    draw.rectangle(
        [off, off,
         off + layout.width * px_per_cell - 1,
         off + layout.height * px_per_cell - 1],
        outline=(255, 30, 30), width=6,
    )
    for hall in layout.hallways:
        draw.rectangle(
            [off + hall.x * px_per_cell, off + hall.y * px_per_cell,
             off + (hall.x + hall.w) * px_per_cell - 1,
             off + (hall.y + hall.h) * px_per_cell - 1],
            outline=(255, 60, 200), width=1,
        )


def _draw_props_off(draw, props, layout, font, off: int) -> None:
    def _room_of(px, pz):
        for r in layout.rooms:
            x0 = r.rect.x * CELL_SIZE
            x1 = (r.rect.x + r.rect.w) * CELL_SIZE
            z0 = r.rect.y * CELL_SIZE
            z1 = (r.rect.y + r.rect.h) * CELL_SIZE
            if x0 <= px <= x1 and z0 <= pz <= z1:
                return f"{r.archetype}@{r.rect.x},{r.rect.y}"
        return "_outside"
    labelled: set[tuple[str, str]] = set()
    for prop in props:
        cat = _placement_of(prop.type)
        col = CATEGORY_DOT.get(cat, (255, 255, 255))
        cx = off + int(prop.x * PIXELS_PER_METRE)
        cy = off + int(prop.z * PIXELS_PER_METRE)
        draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2],
                     fill=col, outline=(0, 0, 0))
        key = (_room_of(prop.x, prop.z), prop.type)
        if key in labelled:
            continue
        labelled.add(key)
        draw.text((cx + 4, cy - 7), prop.type, font=font, fill=(245, 245, 245))


def _overlay_reservations_off(draw, grid, off: int) -> None:
    f = grid.frame
    for prop_type, w, d, sw, sd, _wall in grid.reservations:
        col = CATEGORY_FILL.get(_placement_of(prop_type), CATEGORY_FILL["floor"])
        wm0 = w * SUB_CELL - f.width / 2
        dm0 = d * SUB_CELL
        wm1 = (w + sw) * SUB_CELL - f.width / 2
        dm1 = (d + sd) * SUB_CELL
        x0, z0 = f.place(dm0, wm0)
        x1, z1 = f.place(dm1, wm1)
        px0 = off + int(min(x0, x1) * PIXELS_PER_METRE)
        px1 = off + int(max(x0, x1) * PIXELS_PER_METRE)
        py0 = off + int(min(z0, z1) * PIXELS_PER_METRE)
        py1 = off + int(max(z0, z1) * PIXELS_PER_METRE)
        draw.rectangle([px0, py0, px1, py1], fill=col)


def _tile_layer(draw: ImageDraw.ImageDraw, layout, px_per_cell: int) -> None:
    for y in range(layout.height):
        for x in range(layout.width):
            if layout.cells[y * layout.width + x] == 0:
                continue
            draw.rectangle(
                [x * px_per_cell, y * px_per_cell,
                 (x + 1) * px_per_cell - 1, (y + 1) * px_per_cell - 1],
                fill=TILE_CORRIDOR,
            )
    for room in layout.rooms:
        col = ARCHETYPE_TILE.get(room.archetype, ARCHETYPE_TILE["classroom"])
        r = room.rect
        draw.rectangle(
            [r.x * px_per_cell, r.y * px_per_cell,
             (r.x + r.w) * px_per_cell - 1, (r.y + r.h) * px_per_cell - 1],
            fill=col,
        )
    if layout.atrium is not None:
        a = layout.atrium
        draw.rectangle(
            [a.x * px_per_cell, a.y * px_per_cell,
             (a.x + a.w) * px_per_cell - 1, (a.y + a.h) * px_per_cell - 1],
            fill=TILE_ATRIUM,
        )
    for dx, dz in layout.doors:
        cx, cy = int(dx * PIXELS_PER_METRE), int(dz * PIXELS_PER_METRE)
        draw.rectangle([cx - 3, cy - 3, cx + 3, cy + 3], fill=TILE_DOOR)


def _overlay_reservations(draw, grid: RoomGrid) -> None:
    f = grid.frame
    for prop_type, w, d, sw, sd, _wall in grid.reservations:
        col = CATEGORY_FILL.get(_placement_of(prop_type), CATEGORY_FILL["floor"])
        wm0 = w * SUB_CELL - f.width / 2
        dm0 = d * SUB_CELL
        wm1 = (w + sw) * SUB_CELL - f.width / 2
        dm1 = (d + sd) * SUB_CELL
        x0, z0 = f.place(dm0, wm0)
        x1, z1 = f.place(dm1, wm1)
        px0 = int(min(x0, x1) * PIXELS_PER_METRE)
        px1 = int(max(x0, x1) * PIXELS_PER_METRE)
        py0 = int(min(z0, z1) * PIXELS_PER_METRE)
        py1 = int(max(z0, z1) * PIXELS_PER_METRE)
        draw.rectangle([px0, py0, px1, py1], fill=col)


def _draw_props(draw, props, layout, font) -> None:
    # Build a room-lookup so we can dedupe labels per-room (a classroom
    # has 25 student_desks — labelling each one is unreadable).
    def _room_of(px: float, pz: float) -> str:
        for r in layout.rooms:
            x0 = r.rect.x * CELL_SIZE
            x1 = (r.rect.x + r.rect.w) * CELL_SIZE
            z0 = r.rect.y * CELL_SIZE
            z1 = (r.rect.y + r.rect.h) * CELL_SIZE
            if x0 <= px <= x1 and z0 <= pz <= z1:
                return f"{r.archetype}@{r.rect.x},{r.rect.y}"
        return "_outside"

    labelled: set[tuple[str, str]] = set()
    for prop in props:
        cat = _placement_of(prop.type)
        col = CATEGORY_DOT.get(cat, (255, 255, 255))
        cx = int(prop.x * PIXELS_PER_METRE)
        cy = int(prop.z * PIXELS_PER_METRE)
        draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2],
                     fill=col, outline=(0, 0, 0))
        key = (_room_of(prop.x, prop.z), prop.type)
        if key in labelled:
            continue
        labelled.add(key)
        draw.text((cx + 4, cy - 7), prop.type, font=font, fill=(245, 245, 245))


def _draw_room_boundaries(draw, layout, px_per_cell: int) -> None:
    """Red rect = placement boundary (`MARGIN` cells inset from every
    edge — where the floor-plan generator is actually allowed to drop
    rooms and corridors). The void outside is the safety strip.
    Magenta = hallway / atrium rects (corridor bounding boxes)."""
    from app.world.constants import MARGIN
    draw.rectangle(
        [MARGIN * px_per_cell, MARGIN * px_per_cell,
         (layout.width - MARGIN) * px_per_cell - 1,
         (layout.height - MARGIN) * px_per_cell - 1],
        outline=(255, 30, 30), width=8,
    )
    # Hallway + atrium outlines (kept — they show the corridor skeleton).
    for hall in layout.hallways:
        draw.rectangle(
            [hall.x * px_per_cell, hall.y * px_per_cell,
             (hall.x + hall.w) * px_per_cell - 1,
             (hall.y + hall.h) * px_per_cell - 1],
            outline=(255, 60, 200), width=1,
        )


def _draw_legends(draw, img_w: int) -> None:
    title_font = _font(16)
    label_font = _font(13)
    # --- Category legend (top-left) ---
    x, y = 8, 8
    draw.text((x, y), "PLACEMENT CATEGORIES (overlay color)",
              font=title_font, fill=(255, 255, 255))
    y += 22
    for cat, label in [
        ("wall",   "wall  — must touch a wall (whiteboard, locker, vending, sink, ...)"),
        ("center", "center — must have wall clearance (cafeteria_table, student_desk, gym_mat)"),
        ("corner", "corner — snaps to a room corner (plant)"),
        ("floor",  "floor — anywhere (papers, recycle_bin, mop_bucket, backpack)"),
        ("on_top", "on_top — must sit on a parent (microwave→counter, laptop→desk)"),
    ]:
        col = CATEGORY_FILL[cat][:3]
        draw.rectangle([x, y, x + 18, y + 14], fill=col, outline=(255, 255, 255))
        draw.text((x + 24, y), label, font=label_font, fill=(245, 245, 245))
        y += 20

    # --- Archetype legend (below) ---
    y += 8
    draw.text((x, y), "ROOM ARCHETYPES (tile background)",
              font=title_font, fill=(255, 255, 255))
    y += 22
    items: list[tuple[tuple[int, int, int], str]] = [
        (ARCHETYPE_TILE["classroom"],    "classroom"),
        (ARCHETYPE_TILE["teacher_room"], "teacher_room"),
        (ARCHETYPE_TILE["toilet"],       "toilet"),
        (ARCHETYPE_TILE["gym"],          "gym"),
        (ARCHETYPE_TILE["cafeteria"],    "cafeteria"),
        (ARCHETYPE_TILE["janitor_room"], "janitor_room"),
        (ARCHETYPE_TILE["server_room"],  "server_room"),
        (TILE_ATRIUM,                    "atrium"),
        (TILE_CORRIDOR,                  "corridor"),
        (TILE_DOOR,                      "door"),
    ]
    for col, label in items:
        draw.rectangle([x, y, x + 18, y + 14], fill=col, outline=(255, 255, 255))
        draw.text((x + 24, y), label, font=label_font, fill=(245, 245, 245))
        y += 20
    # Boundary key.
    y += 8
    draw.text((x, y), "LAYOUT BOUNDARIES (outline color)",
              font=title_font, fill=(255, 255, 255))
    y += 22
    for col, label in [
        ((255, 30, 30),  "bitmap boundary — full grid the generator runs "
                         "inside (GRID_W × GRID_H cells)"),
        ((255, 60, 200), "hallway/atrium rect — corridor & central hub "
                         "bounding boxes"),
    ]:
        draw.rectangle([x, y, x + 18, y + 14], outline=col, width=2)
        draw.text((x + 24, y), label, font=label_font, fill=(245, 245, 245))
        y += 20


def render(seed: int, size: int, out_path: Path) -> None:
    _dec_mod.reset_grid_capture()
    world, layout = generate(seed=seed, width=size, height=size,
                             objective_count=5)
    grids = list(_dec_mod.LAST_GRIDS)
    px_per_cell = int(CELL_SIZE * PIXELS_PER_METRE)
    pad_px = PAD_CELLS * px_per_cell
    grid_px = size * px_per_cell
    img_w = grid_px + 2 * pad_px
    img_h = img_w
    img = Image.new("RGB", (img_w, img_h), TILE_VOID)
    draw = ImageDraw.Draw(img, "RGBA")

    # Origin offset so (0,0) of layout sits at (pad_px, pad_px) on canvas.
    def shift_layer(layer_draw_fn):
        layer = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
        layer_draw_fn(ImageDraw.Draw(layer, "RGBA"), pad_px)
        img.paste(layer, (0, 0), layer)

    # Background tiles + room fills.
    shift_layer(lambda d, off: _tile_layer_off(d, layout, px_per_cell, off))
    # Grid lines (every CELL boundary across the whole bitmap).
    shift_layer(lambda d, off: _draw_grid_lines(
        d, layout, px_per_cell, off, GRID_LINE_COLOR, step_cells=1, width=1,
    ))
    # Sub-cell lines inside rooms only (denser, fainter).
    shift_layer(lambda d, off: _draw_subgrid_lines(d, grids, off))
    # Prop occupancy overlay.
    shift_layer(lambda d, off: _overlay_all(d, grids, off))
    # Red bitmap boundary + magenta corridor outlines.
    shift_layer(lambda d, off: _draw_room_boundaries_off(
        d, layout, px_per_cell, off,
    ))
    # Prop dots + labels.
    label_font = _font(11)
    shift_layer(lambda d, off: _draw_props_off(
        d, world.props, layout, label_font, off,
    ))
    # Legend stays at (0,0) — top-left corner of the padded canvas.
    _draw_legends(ImageDraw.Draw(img, "RGBA"), img_w)
    img.save(out_path)
    print(f"wrote {out_path}  ({img_w}x{img_h}px, {len(world.props)} props, "
          f"{len(layout.rooms)} rooms)")


def _crop_to_content(img: Image.Image, layout, px_per_cell: int) -> Image.Image:
    """No-op: we want the full bitmap so the outer red boundary is
    visible. Kept as a function so the call site doesn't change."""
    return img


def main() -> None:
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 42
    size = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    out = Path(__file__).parent / "world.png"
    render(seed, size, out)


if __name__ == "__main__":
    main()
