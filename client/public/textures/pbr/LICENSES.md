# Texture Licenses

Every texture and HDRI in this directory is CC0 1.0 / public domain and requires no attribution to use, modify or redistribute; the table below is provided for traceability only.

| Category | Asset | Source URL | Source | License | Fetched |
|---|---|---|---|---|---|
| `wall_plaster_green` | PaintedPlaster003 | https://ambientcg.com/view?id=PaintedPlaster003 | ambientCG | CC0 1.0 | 2026-09-09 |
| `wall_plaster_plain` | Plaster001 | https://ambientcg.com/view?id=Plaster001 | ambientCG | CC0 1.0 | 2026-09-09 |
| `wall_tile_white` | Tiles036 | https://ambientcg.com/view?id=Tiles036 | ambientCG | CC0 1.0 | 2026-09-09 |
| `wall_tile_hex` | Tiles071 | https://ambientcg.com/view?id=Tiles071 | ambientCG | CC0 1.0 | 2026-09-09 |
| `wall_concrete` | Concrete015 | https://ambientcg.com/view?id=Concrete015 | ambientCG | CC0 1.0 | 2026-09-09 |
| `dado_tile_green` | Tiles032 | https://ambientcg.com/view?id=Tiles032 | ambientCG | CC0 1.0 | 2026-09-09 |
| `floor_terrazzo` | Terrazzo004 | https://ambientcg.com/view?id=Terrazzo004 | ambientCG | CC0 1.0 | 2026-09-09 |
| `floor_lino` | Tiles141 | https://ambientcg.com/view?id=Tiles141 | ambientCG | CC0 1.0 | 2026-09-09 |
| `floor_carpet` | Carpet011 | https://ambientcg.com/view?id=Carpet011 | ambientCG | CC0 1.0 | 2026-09-09 |
| `floor_stone_tile` | Tiles002 | https://ambientcg.com/view?id=Tiles002 | ambientCG | CC0 1.0 | 2026-09-09 |
| `floor_terrazzo_dark` | Terrazzo001 | https://ambientcg.com/view?id=Terrazzo001 | ambientCG | CC0 1.0 | 2026-09-09 |
| `floor_wood` | Wood087 | https://ambientcg.com/view?id=Wood087 | ambientCG | CC0 1.0 | 2026-09-09 |
| `ceiling_tile` | Tiles020 | https://ambientcg.com/view?id=Tiles020 | ambientCG | CC0 1.0 | 2026-09-09 |
| `ceiling_plaster` | Plaster003 | https://ambientcg.com/view?id=Plaster003 | ambientCG | CC0 1.0 | 2026-09-09 |
| `decal_leak` | Leaking005 | https://ambientcg.com/view?id=Leaking005 | ambientCG | CC0 1.0 | 2026-09-09 |
| `hdri` | creepy_bathroom | https://polyhaven.com/a/creepy_bathroom | Poly Haven | CC0 1.0 | 2026-09-09 |

## File layout

Each category directory holds `albedo-1k.webp`, `normal-1k.webp` and `orm-1k.webp`, plus matching `-512` variants at half resolution. `decal_leak` ships only `albedo-1k.webp` / `albedo-512.webp` (RGBA, alpha from the source Opacity map) and `normal-1k.webp` / `normal-512.webp`, with no ORM map.

ORM channel packing is occlusion in R, roughness in G, metallic in B. Normal maps use the OpenGL convention (green channel pointing up). Ambient occlusion is additionally pre-baked into the albedo maps at 0.6 strength.

The following categories have their albedo desaturated before the client's tint multiply, because the source asset's hue does not match the intended surface and the client supplies the final hue itself: `ceiling_tile` (0.9).

Run `tools/fetch_textures.py` to regenerate this entire tree.
