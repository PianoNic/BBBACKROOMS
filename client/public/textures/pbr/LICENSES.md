# Texture Licenses

Every texture in this directory is CC0 1.0 / public domain and requires no attribution to use, modify or redistribute; the table below is provided for traceability only.

| Category | Asset | Source URL | Source | License | Fetched |
|---|---|---|---|---|---|
| `wall_plaster_cream` | PaintedPlaster017 | https://ambientcg.com/view?id=PaintedPlaster017 | ambientCG | CC0 1.0 | 2026-09-10 |
| `wall_plaster_plain` | Plaster001 | https://ambientcg.com/view?id=Plaster001 | ambientCG | CC0 1.0 | 2026-09-10 |
| `wall_tile_white` | Tiles036 | https://ambientcg.com/view?id=Tiles036 | ambientCG | CC0 1.0 | 2026-09-10 |
| `wall_tile_hex` | Tiles071 | https://ambientcg.com/view?id=Tiles071 | ambientCG | CC0 1.0 | 2026-09-10 |
| `wall_concrete` | Concrete015 | https://ambientcg.com/view?id=Concrete015 | ambientCG | CC0 1.0 | 2026-09-10 |
| `dado_tile_green` | Tiles032 | https://ambientcg.com/view?id=Tiles032 | ambientCG | CC0 1.0 | 2026-09-10 |
| `floor_terrazzo` | Terrazzo004 | https://ambientcg.com/view?id=Terrazzo004 | ambientCG | CC0 1.0 | 2026-09-10 |
| `floor_lino` | Tiles141 | https://ambientcg.com/view?id=Tiles141 | ambientCG | CC0 1.0 | 2026-09-10 |
| `floor_carpet` | Carpet011 | https://ambientcg.com/view?id=Carpet011 | ambientCG | CC0 1.0 | 2026-09-10 |
| `floor_stone_tile` | Tiles002 | https://ambientcg.com/view?id=Tiles002 | ambientCG | CC0 1.0 | 2026-09-10 |
| `floor_terrazzo_dark` | Terrazzo001 | https://ambientcg.com/view?id=Terrazzo001 | ambientCG | CC0 1.0 | 2026-09-10 |
| `floor_wood` | Wood087 | https://ambientcg.com/view?id=Wood087 | ambientCG | CC0 1.0 | 2026-09-10 |
| `ceiling_tile` | Tiles020 | https://ambientcg.com/view?id=Tiles020 | ambientCG | CC0 1.0 | 2026-09-10 |
| `ceiling_plaster` | Plaster003 | https://ambientcg.com/view?id=Plaster003 | ambientCG | CC0 1.0 | 2026-09-10 |
| `decal_leak` | Leaking005 | https://ambientcg.com/view?id=Leaking005 | ambientCG | CC0 1.0 | 2026-09-10 |

## File layout

Each category directory holds a single `albedo-512.webp` (RGBA for `decal_leak`, alpha from the source Opacity map; RGB for the rest), with ambient occlusion pre-baked into it at 0.6 strength.

The following categories have their albedo desaturated before the client's tint multiply, because the source asset's hue does not match the intended surface and the client supplies the final hue itself: `ceiling_tile` (0.9).

Run `tools/fetch_textures.py` to regenerate this entire tree.
