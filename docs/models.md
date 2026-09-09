# Models

Twenty-three props and all six world pickups used to be procedural — boxes
and cylinders built in `propBuilders/*.ts` and `gameplay/pickupModels.ts` at
runtime. This replaces them with realistic CC0 PBR glTF models fetched from
Poly Haven, while keeping the procedural builders as the `niedrig`-tier
fallback (same reasoning as the [Materials](materials.md) PBR set: that tier
must cost nothing).

## What moved to a model

Every model is CC0 1.0 — no attribution is legally required — but
[`client/public/models/LICENSES.md`](../client/public/models/LICENSES.md)
credits every author anyway.

| Prop type | Poly Haven asset | Author | Triangles | LOD triangles |
|---|---|---|---|---|
| `bench` | painted_wooden_bench | Kirill Sannikov | 630 | — |
| `books_pile` | binder_notebook | DaDrood | 1,987 | 1,967 |
| `bookshelf` | Shelf_01 | Gabriel Radić | 182 | — |
| `bunsen_burner` | bunsen_burner | BKS | 2,108 | 1,417 |
| `cafeteria_table` | dining_table | Aron Łyczek | 1,048 | — |
| `chair` | SchoolChair_01 | Ethan Place | 2,282 | 1,520 |
| `clock` | wall_clock | PierreB3D | 1,829 | 1,096 |
| `cupboard` | drawer_cabinet | Ulan Cabanilla | 3,418 | 1,856 |
| `desk` | metal_office_desk | Ulan Cabanilla | 4,137 | 2,068 |
| `fire_extinguisher` | korean_fire_extinguisher_01 | UM JOORIN | 1,981 | 1,516 |
| `laptop` | classic_laptop | Arrangemonk | 4,532 | 4,047 |
| `locker` | painted_wooden_cabinet_02 | Kirill Sannikov | 966 | — |
| `microscope` | industrial_microscope | Lukas Walzer | 4,795 | 4,779 |
| `microwave` | vintage_microwave | Adam Nekola | 2,435 | 1,362 |
| `mop_bucket` | wooden_bucket_01 | James Ray Cock | 2,046 | 1,771 |
| `papers` | office_notepads | Ulan Cabanilla | 666 | — |
| `plant` | potted_plant_04 | James Ray Cock | 3,998 | 3,496 |
| `pylon` | WetFloorSign_01 | Fran Calvente | 228 | — |
| `recycle_bin` | plastic_crate_02 | Fabi_G | 2,308 | 2,290 |
| `side_table` | side_table_01 | James Ray Cock | 1,929 | 1,365 |
| `sofa` | Sofa_01 | Kirill Sannikov | 4,101 | 1,341 |
| `student_desk` | SchoolDesk_01 | Ethan Place | 2,080 | 1,248 |
| `trash_can` | industrial_pastic_container | Galo Benivegna | 4,328 | 4,268 |

`locker` is new in this pass: Poly Haven has no school-locker asset, so
`painted_wooden_cabinet_02` ships as a CC0 stand-in, scaled non-uniformly
to fit the 0.5 x 1.8 x 0.4m locker envelope (see below). It replaces the
Sketchfab "School locker" candidate that would otherwise have needed a
`SKETCHFAB_API_TOKEN` — see [Why Sketchfab's picks weren't fetched](#why-sketchfabs-picks-werent-fetched).

### Pickups

The six world pickups (`PickupKind` in `net/protocol.ts`) also moved off
`gameplay/pickupModels.ts`'s procedural builders onto CC0 Poly Haven models,
each picked and scaled to stay handheld-sized (roughly 0.2–0.4m in its
largest dimension) and under ~2,500 triangles:

| Pickup kind | Poly Haven asset | Author | Triangles |
|---|---|---|---|
| `medkit` | medical_box | Ulan Cabanilla | 1,858 |
| `potion` | multi_cleaner_bottle | James Ray Cock | 2,376 |
| `compass` | seadogs_compass | Benny Weimer | 2,911 |
| `tracker` | retro_multimeter | elli moeller | 2,685 |
| `goggles` | old_gas_mask | Michał Wiśniewski | 2,731 |
| `gps` | digital_wrist_watch | Adrian C | 2,632 |

Pickups never get an LOD mesh (see [LOD meshes](#lod-meshes)) — they are
small, few, and already cheap.

## Non-uniform scale and the hinge contract

Most props still use a single uniform `scale` factor, but `ModelSpec` in
`tools/fetch_models.py` now also accepts `scale_y` / `scale_z`, defaulting
to `scale` when omitted. `locker` is the first (and so far only) model that
needs this: `painted_wooden_cabinet_02` is 0.997 x 2.569 x 0.729m at source,
and the in-game locker envelope is 0.5 x 1.8 x 0.4m — a uniform scale can't
hit all three axes at once, so it ships with `scale=0.50`, `scale_y=0.70`,
`scale_z=0.55`. `footprints.json` always writes all three (`scale`,
`scaleY`, `scaleZ`) for every prop and pickup, even when they're equal.

`ModelSpec` also carries optional `hinge_node` / `hinge_side` /
`hinge_open_rad` fields. Only `locker` sets them, pointing at the source
glTF's door node (`painted_wooden_cabinet_02_door`), `side: "left"`, and
`openRad: 1.5708` (90°). Because gltfpack can rename or strip node names
during compression, the fetch script packs any model with a `hinge_node`
using gltfpack's `-kn` (keep names) flag, then re-opens the packed `.glb`'s
JSON chunk and checks that a node name *containing* the configured
`hinge_node` string survived — the client matches the leaf mesh by name
substring, not exact equality, since gltfpack can still prefix/suffix
names even with `-kn`. If the node can't be found, the script prints a
`WARNING` to stderr instead of failing the whole run. For this pass the
node survived intact. When a model declares a hinge, `footprints.json`
carries a `hinge: { node, side, openRad }` block for it; the key is
omitted entirely for every other prop and for all pickups.

## LOD meshes

Any prop model whose packed triangle count exceeds 1,500 also gets a
`<category>/<name>_lod1.glb`, built from the same source glTF with
`gltfpack -si <ratio>`. The ratio isn't a flat 0.3: it's derived from the
model's own main-pack simplify ratio (`min(0.3, mainRatio * 0.5)`, floored
at 0.02) so that heavily-simplified main models — some already run through
`-si 0.1` or `-si 0.2` — don't end up with an "LOD" that has *more*
triangles than the model it's supposed to replace at distance. The script
verifies this after packing and falls back to re-simplifying the already-
packed main `.glb` (rather than the raw source) if the first attempt isn't
strictly lighter. Textures for the LOD pass are copied into a scratch
directory under `tools/.model-cache/_lod_scratch/` and downscaled to 256px
before packing, so the LOD never doubles the texture budget of the main
model, and the main model's own cached textures are never touched.

`footprints.json` records the LOD as a `lod` key (e.g.
`"lod": "furniture/cupboard_lod1"`) on props that have one; the key is
omitted entirely when a model is under the threshold. Pickups never carry
an `lod` key.

The client is expected to switch a prop to its LOD mesh once the camera is
roughly 18 metres away, and back to the full mesh once it's closer again —
the exact swap is implemented on the rendering side, not in this pipeline.

## Why Sketchfab's picks weren't fetched

An earlier research pass had identified good CC-BY matches on Sketchfab for
the room door, the metal door, the whiteboard, the notice board, the
bathroom sink, the toilet, the urinal, and the exit sign. Downloading from
Sketchfab needs a `SKETCHFAB_API_TOKEN`, which is not available in this
environment, so none of those were fetched:

| Prop type | Title | Author | Sketchfab UID | Credit line |
|---|---|---|---|---|
| room door | Animated low-poly door | Dead-Soul | `b31949b739874c119d31d89a3ec942a3` | "Animated low-poly door" by Dead-Soul, licensed CC-BY, via sketchfab.com/3d-models/b31949b739874c119d31d89a3ec942a3 |
| metal door | Metal door | LiveToWin34 | `b5daec11666248c2acd0a9ff2fd22969` | "Metal door" by LiveToWin34, licensed CC-BY, via sketchfab.com/3d-models/b5daec11666248c2acd0a9ff2fd22969 |
| whiteboard | Whiteboard | Reflex_Entertainment | `eff6059c0f654aa3a5ba5e10eb59591e` | "Whiteboard" by Reflex_Entertainment, licensed CC-BY, via sketchfab.com/3d-models/eff6059c0f654aa3a5ba5e10eb59591e |
| notice board | Notice board | Viktor_ | `c7253f06bb8c49b0afcd60a509a8240c` | "Notice board" by Viktor_, licensed CC-BY, via sketchfab.com/3d-models/c7253f06bb8c49b0afcd60a509a8240c |
| bathroom sink | Bathroom sink | kEam | `45a6ab5e5a1a40b8913ab14314734ce8` | "Bathroom sink" by kEam, licensed CC-BY, via sketchfab.com/3d-models/45a6ab5e5a1a40b8913ab14314734ce8 |
| toilet | Toilet | Allan-Jay Branscombe | `6ac515a1c4154db18b5b4bd0b46d6405` | "Toilet" by Allan-Jay Branscombe, licensed CC-BY, via sketchfab.com/3d-models/6ac515a1c4154db18b5b4bd0b46d6405 |
| urinal | Urinal | CurlyFryWhy | `edbcda9bf0854e60bd6fea1a592f0bbe` | "Urinal" by CurlyFryWhy, licensed CC-BY, via sketchfab.com/3d-models/edbcda9bf0854e60bd6fea1a592f0bbe |
| exit sign | Exit sign | Adventure Dude | `56000263a5aa466c96df8e1d36533668` | "Exit sign" by Adventure Dude, licensed CC-BY, via sketchfab.com/3d-models/56000263a5aa466c96df8e1d36533668 |

As a direct consequence, **room doors, toilet-stall doors, the fuse box,
the whiteboard, and the remaining bathroom fixtures (sink, urinal, toilet
stall) stay procedural**. Their hinge/lever logic and the whiteboard's
dynamic marker-canvas texture are untouched either way — a real door model
would still need the same procedural hinge/lock code driving it, so
swapping the mesh later (once a token is available) is a pure asset change,
not a logic change.

The school locker candidate (`c32db0c65ddb46ce9e6f752b4a0b110b`, "School
locker" by an unlisted author, CC-BY) is no longer on this list: a CC0
Poly Haven stand-in (`painted_wooden_cabinet_02`, shipped as prop type
`locker`) replaced the need for it entirely, so there's nothing left to
fetch there even once a token exists. It's still recorded in
[`LICENSES.md`](../client/public/models/LICENSES.md) for context.

The rest of the procedural props (lab bench, radiator, server rack,
basketball hoop, gym mat, ball rack, piano, trophy case, skeleton,
aquarium, swiss flag, easel, globe, printer, projector, fume hood, chemical
shelf, emergency shower, coat rack, vending machine, counter, coffee
machine, fridge, closet, water dispenser, backpack, map, bulletin board,
painting, floor lamp) simply had no CC0 match at a usable size or footprint
on this pass.

## Asset pipeline

`tools/fetch_models.py` turns a Poly Haven asset slug into a game-ready
`.glb`:

1. Query the Poly Haven files API for the asset, and download the 1K glTF
   plus its textures.
2. Downscale every texture to 512px JPEG at quality 85 with Pillow — the
   same budget as the material textures in [Materials](materials.md).
3. Run `gltfpack -c` (meshopt compression) over the result, with a
   per-model `-si` simplification ratio where the raw mesh is denser than
   the game needs, and `-kn` for any model that declares a `hinge_node` so
   the door/drawer node name survives compression.
4. Write one `.glb` per prop or pickup under `client/public/models/<category>/`
   (`furniture`, `clutter`, `wall`, `lab`, `appliances`, and now `pickups`).
5. For any prop over the 1,500-triangle LOD threshold, additionally build
   `<category>/<name>_lod1.glb` (see [LOD meshes](#lod-meshes)).

The script is idempotent per output file — it skips anything already built
unless `--force` is passed — and it self-heals: if an existing LOD file
isn't actually lighter than its main model (an artifact of an earlier
version of this script that used a flat `-si 0.3` regardless of the main
model's own ratio), it's silently rebuilt on the next run even without
`--force`.

## The footprint contract

`tools/fetch_models.py` measures the scaled, world-space bounding box of
every model it produces (applying `scale` to X, `scale_y` to Y, `scale_z`
to Z) and writes it to `client/public/models/footprints.json`, alongside
`subCellMetres: 0.5`. The file has two top-level sections:

- `props`: one entry per `PropType`, each with `model`, `asset`, `scale`,
  `scaleY`, `scaleZ`, `yawOffset`, `along`, `out`, `height`, `triangles`,
  an optional `lod` path, and an optional `hinge` block.
- `pickups`: one entry per `PickupKind` (`medkit`, `potion`, `compass`,
  `tracker`, `goggles`, `gps`), with the same shape minus `lod`/`hinge`
  (pickups never carry either).

`server/app/domain/world/prop_specs.py` declares, independently, how many
0.5m sub-cells each prop type reserves on the placement grid. Nothing keeps
those two numbers in sync automatically — a model swap could silently
shrink or grow a mesh while the server's reservation stays stale, either
clipping neighbouring props or wasting floor space.

`server/tests/domain/test_prop_footprint_sync.py` closes that gap:

- for every prop type present in both `footprints.json` and `PROP_SPECS`,
  it asserts the sub-cell reservation contains the model (within a 10%
  tolerance) and isn't oversized by more than one sub-cell (again within
  10%);
- for every pickup, it asserts the model file exists, its largest
  dimension is between 0.05m and 0.6m, and it's under 3,000 triangles;
- for every prop that declares an `lod`, it asserts the LOD file exists
  and has fewer triangles than the full model, by reading both `.glb`s'
  JSON chunks directly (a small self-contained helper, not a dependency on
  `tools/fetch_models.py`);
- it asserts the whole `client/public/models` tree stays under the 25MB
  budget.

If the fetch script hasn't been run yet in a fresh clone, the whole module
skips instead of failing — CI always has the committed `footprints.json`.

This pass moved three footprints to match the real meshes (unchanged from
the previous pass):

| prop | old footprint | new footprint | reason |
|---|---|---|---|
| `chair` | `(1, 1)` | `(2, 2)` | SchoolChair_01 is 0.566 x 0.675m; a 0.5 x 0.5m reservation cannot contain it |
| `bookshelf` | `(3, 1)` | `(2, 1)` | Shelf_01 is 1.003 x 0.257m, so 1.5m along the wall over-reserved by a full sub-cell |
| `side_table` | `(2, 2)` | `(2, 1)` | side_table_01 is 0.550 x 0.450m deep, one sub-cell out, not two |

`locker`'s non-uniform scale was tuned specifically to land inside its
existing `(1, 1)` `PROP_SPECS` reservation (0.5 x 0.5m): the packed model
measures 0.498 x 0.401m, comfortably inside without needing a spec change.

## Archetype bundles and lazy loading

`client/src/world/modelProps.ts` doesn't load every model up front. Each
`RoomArchetype` (classroom, teacher_room, cafeteria, chemistry_lab,
janitor_room, toilet, gym, server_room, hallway) declares an
`ARCHETYPE_BUNDLES` entry — the prop types that actually appear in that
kind of room — and a `COMMON_BUNDLE` covers prop types that show up almost
everywhere (chairs, laptops, bins, plants, clocks, fire extinguishers,
benches). `bundlesFor()` inspects the level's rooms via `RoomInference`,
works out which archetype the spawn point sits in, and splits every model
the level could need into two sets: `immediate` (the spawn room's archetype
plus the common bundle — loaded before the player can move) and `deferred`
(every other archetype present in the level, minus anything already
covered — loaded in the background afterward). `ModelLibrary` in
`client/src/rendering/modelLoader.ts` then loads each `PropType`'s `.glb`
lazily and caches the resulting `AssetContainer`, so a level with a gym and
a server room (neither of which declare any modelled props) never fetches
anything for them.

## The meshopt decoder

Every packed `.glb` is meshopt-compressed (`gltfpack -c`). The decoder used
to unpack these at runtime is self-hosted at
`client/public/decoders/meshopt_decoder.js` — copied by the fetch script
from the installed `meshoptimizer` npm package on every run, not pulled
from a CDN — and `ModelLibrary` points Babylon's `MeshoptCompression`
configuration at it before any model load starts.

## The 25MB budget

`client/public/models` has a hard ceiling of 25MB. After this pass (22
original props + `locker` + 6 pickups + 16 LOD meshes) the tree sits at
**6.73MB** — `tools/fetch_models.py` prints the exact on-disk total after
every run, and the server test suite asserts it stays under budget.

## Tier behaviour

Niedrig keeps every procedural builder exactly as before — no models load,
same reasoning as the material set in #128: that tier has to stay free.
Mittel and above load the real models instead, switching to a prop's `lod1`
mesh past ~18m and back to the full mesh once the camera closes in again.

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
anything already downloaded and converted, and self-heals any LOD mesh
that isn't actually lighter than its main model — pass `--force` to redo
everything regardless. Downloaded sources are cached under the gitignored
`tools/.model-cache/`, including a `_lod_scratch/` subdirectory holding the
256px texture copies used only for LOD packing, so repeated runs don't
re-hit the Poly Haven API.
