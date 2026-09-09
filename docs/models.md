# Models

Twenty-two props used to be procedural — boxes and cylinders built in
`propBuilders/*.ts` at runtime. This replaces them with realistic CC0 PBR
glTF models fetched from Poly Haven, while keeping the procedural builders
as the `niedrig`-tier fallback (same reasoning as the [Materials](materials.md)
PBR set: that tier must cost nothing).

## What moved to a model

Every model is CC0 1.0 — no attribution is legally required — but
[`client/public/models/LICENSES.md`](../client/public/models/LICENSES.md)
credits every author anyway.

| Prop type | Poly Haven asset | Author |
|---|---|---|
| `bench` | painted_wooden_bench | Kirill Sannikov |
| `books_pile` | binder_notebook | DaDrood |
| `bookshelf` | Shelf_01 | Gabriel Radić |
| `bunsen_burner` | bunsen_burner | BKS |
| `cafeteria_table` | dining_table | Aron Łyczek |
| `chair` | SchoolChair_01 | Ethan Place |
| `clock` | wall_clock | PierreB3D |
| `cupboard` | drawer_cabinet | Ulan Cabanilla |
| `desk` | metal_office_desk | Ulan Cabanilla |
| `fire_extinguisher` | korean_fire_extinguisher_01 | UM JOORIN |
| `laptop` | classic_laptop | Arrangemonk |
| `microscope` | industrial_microscope | Lukas Walzer |
| `microwave` | vintage_microwave | Adam Nekola |
| `mop_bucket` | wooden_bucket_01 | James Ray Cock |
| `papers` | office_notepads | Ulan Cabanilla |
| `plant` | potted_plant_04 | James Ray Cock |
| `pylon` | WetFloorSign_01 | Fran Calvente |
| `recycle_bin` | plastic_crate_02 | Fabi_G |
| `side_table` | side_table_01 | James Ray Cock |
| `sofa` | Sofa_01 | Kirill Sannikov |
| `student_desk` | SchoolDesk_01 | Ethan Place |
| `trash_can` | industrial_pastic_container | Galo Benivegna |

## Why Sketchfab's picks weren't fetched

An earlier research pass had also identified good CC-BY matches on
Sketchfab for the room door, the metal door, the whiteboard, the notice
board, the bathroom sink, the toilet, the urinal, the school locker, and the
exit sign. Downloading from Sketchfab needs a `SKETCHFAB_API_TOKEN`, which
was not available in this environment, so none of those were fetched. As a
direct consequence, **doors, lockers, the whiteboard, and the bathroom
fixtures (sink, urinal, toilet stall) stay procedural**. Their hinge/lever
logic and the whiteboard's dynamic marker-canvas texture are untouched
either way.

The rest of the procedural props (lab bench, radiator, server rack,
basketball hoop, gym mat, ball rack, piano, trophy case, skeleton,
aquarium, swiss flag, easel, globe, printer, projector, fume hood, chemical
shelf, emergency shower, coat rack, vending machine, counter, coffee
machine, fridge, closet, water dispenser, backpack, map, bulletin board,
painting, floor lamp) simply had no CC0 match at a usable size or footprint
on this pass. The full accounting, including the Sketchfab candidates and
their credit lines if one is ever added, is in
[`client/public/models/LICENSES.md`](../client/public/models/LICENSES.md).

## Asset pipeline

`tools/fetch_models.py` turns a Poly Haven asset slug into a game-ready
`.glb`:

1. Query the Poly Haven files API for the asset, and download the 1K glTF
   plus its textures.
2. Downscale every texture to 512px JPEG at quality 85 with Pillow — the
   same budget as the material textures in [Materials](materials.md).
3. Run `gltfpack -c` (meshopt compression) over the result, with a
   per-model `-si` simplification ratio where the raw mesh is denser than
   the game needs.
4. Write one `.glb` per prop under `client/public/models/<category>/`.

Every resulting model is at or under 5k triangles, and the full set is
3.7MB total. The meshopt decoder used to unpack these at runtime is
self-hosted at `client/public/decoders/meshopt_decoder.js` — copied from
the installed `meshoptimizer` package, not pulled from a CDN.

## The footprint contract

`tools/fetch_models.py` also measures the scaled, world-space bounding box
of every model it produces and writes it to
`client/public/models/footprints.json`, alongside `subCellMetres: 0.5`.
`server/app/domain/world/prop_specs.py` declares, independently, how many
0.5m sub-cells each prop type reserves on the placement grid. Nothing keeps
those two numbers in sync automatically — a model swap could silently
shrink or grow a mesh while the server's reservation stays stale, either
clipping neighbouring props or wasting floor space.

`server/tests/domain/test_prop_footprint_sync.py` closes that gap: for
every prop type present in both `footprints.json` and `PROP_SPECS`, it
asserts the sub-cell reservation contains the model (within a 10%
tolerance) and isn't oversized by more than one sub-cell (again within
10%). If the fetch script hasn't been run yet in a fresh clone, the test
skips instead of failing — CI always has the committed `footprints.json`.

This pass moved three footprints to match the real meshes:

| prop | old footprint | new footprint | reason |
|---|---|---|---|
| `chair` | `(1, 1)` | `(2, 2)` | SchoolChair_01 is 0.566 x 0.675m; a 0.5 x 0.5m reservation cannot contain it |
| `bookshelf` | `(3, 1)` | `(2, 1)` | Shelf_01 is 1.003 x 0.257m, so 1.5m along the wall over-reserved by a full sub-cell |
| `side_table` | `(2, 2)` | `(2, 1)` | side_table_01 is 0.550 x 0.450m deep, one sub-cell out, not two |

## Tier behaviour

Niedrig keeps every procedural builder exactly as before — no models load,
same reasoning as the material set in #128: that tier has to stay free.
Mittel and above load the real models instead.

## Realistisch tier, and the pixelation default

A fourth graphics tier, `realistisch`, was added alongside `hoch` in
[`client/src/rendering/ambience.ts`](../client/src/rendering/ambience.ts).
Its feature set matches `hoch` exactly — the only difference is in
[`client/src/rendering/pipeline.ts`](../client/src/rendering/pipeline.ts):
`Ambience.applySize` forces the hardware scaling level to `1.0` and sets
`canvas.style.imageRendering` to `"auto"`, so the render target is native
resolution with no pixelation downscale and no nearest-neighbour upscaling.

This exists because the models carry baked PBR normal and AO detail that a
1/4-resolution pixelation pass (the old default) mostly throws away —
detail paid for in triangle and texture budget but invisible on screen. For
the same reason, `DEFAULTS.pixelation` in
[`client/src/core/settings.ts`](../client/src/core/settings.ts) moved from
`4` to `2` for every other tier: the models are worth seeing even without
switching all the way to Realistisch. The 1–8 slider range is unchanged,
and anyone with a saved `bbb_settings` value keeps it — this only changes
what a fresh install starts at.

## Running the model fetch script

```
python tools/fetch_models.py [--force]
```

The script needs Pillow (from the server's Python environment) for texture
downscaling, and `gltfpack` for mesh compression — `gltfpack` isn't a
Python dependency, it's resolved from `client/node_modules/.bin`, so run
`bun install` in `client/` first. It's idempotent — re-running it skips
anything already downloaded and converted — pass `--force` to redo
everything regardless. Downloaded sources are cached under the gitignored
`tools/.model-cache/` so repeated runs don't re-hit the Poly Haven API.
