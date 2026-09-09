# Materials

The world used to render with one flat texture each for floors, walls, and
ceilings, no matter what kind of room a player was standing in. This
overhauls that into a per-room-archetype PBR material set — a classroom
looks, and shades, differently from a toilet block or a server room — while
staying data-driven and tier-gated so low-end hardware still gets the
original flat look for free.

## Why archetypes are inferred, not sent

The server generates rooms (`server/app/world/`, see [Worldgen](worldgen.md))
but never tells the client what kind of room a given cell belongs to.
`Grid.cells` is flattened to `0` (void) / `1` (floor) before it goes out over
`world_init`, and there is no room list anywhere in the payload. Changing
that would mean touching the server and the wire protocol just to carry a
label the client can already work out for itself — so `client/src/world/rooms.ts`
reconstructs the room list purely from the grid plus `init.props`, on every
client, deterministically.

### Inference algorithm

1. **Room vs. corridor.** A floor cell counts as a "room cell" if it sits
   inside *any* all-floor axis-aligned rectangle of at least 4×4 cells.
   Corridors are only 2 cells thick by construction, so no 4×4 all-floor
   window can ever fit inside one — this alone separates rooms from
   corridors without needing the server's room list.
2. **Connected components.** The room cells are grouped into components
   with 4-neighbour flood fill. Each component is a candidate room.
3. **The atrium is a hallway.** The 8×8 spawn atrium at the map centre
   passes the 4×4 test too (it's an 8×8 rectangle), so it would otherwise be
   classified as a "room". The component whose bounding box is at least
   8×8 and closest to the grid centre is forced back to `hallway` instead —
   everything that isn't a room, including this atrium and every corridor
   cell, defaults to `hallway`.
4. **Archetype scoring.** Every remaining component is classified by
   looking at which props from `init.props` fall inside its bounding box
   (world → cell via `floor(p.x / cellSize)`, `floor(p.z / cellSize)`).
   Each archetype has a signature prop list — some props are "strong"
   evidence (e.g. `server_rack` for a server room), some are "weak"
   (e.g. `sink`, which also shows up as incidental dressing elsewhere).
   Strong hits score 3, weak hits score 1, highest total wins; a tie or an
   empty room falls back to `classroom`. Prop types are compared as raw
   strings — the server can emit prop type strings that aren't in the
   client's `PropType` union, so this comparison never assumes the union is
   exhaustive.
5. **Deterministic decal seed.** Each classified room also gets a seed
   derived only from its bounding box's minimum corner (`seedFromPos` +
   `mulberry32`), so every client in the same match places the same water
   stains in the same room without any extra network traffic.

## Archetypes

`classroom`, `hallway`, `cafeteria`, `chemistry_lab`, `gym`, `janitor_room`,
`server_room`, `teacher_room`, `toilet`. `hallway` is also the fallback for
anything that isn't confidently a room — corridors, the atrium, and any
edge case the inference is unsure about.

| archetype | wall | floor | ceiling | dado |
|---|---|---|---|---|
| classroom | plaster, warm plaster tint | lino | acoustic tile | yes |
| hallway | plaster, institutional green | terrazzo | acoustic tile | yes |
| toilet | white tile | lino, low sheen | plaster | yes |
| cafeteria | plaster | stone tile | acoustic tile | no |
| chemistry_lab | hex tile | dark terrazzo | acoustic tile | no |
| gym | plaster | wood | plaster | no |
| janitor_room | bare concrete | bare concrete | plaster | no |
| server_room | bare concrete | lino | plaster | no |
| teacher_room | plaster, warm tint | carpet | acoustic tile | no |

The full tuning table (exact tints, roughness, dado height, UV repeats,
per-surface environment intensity) lives in
[`client/src/rendering/ambience.ts`](../client/src/rendering/ambience.ts)
under `AMBIENCE.materials` — nothing archetype-specific is hardcoded in the
material-building code itself, so retuning a room's look is a config edit,
not a code change. Rooms with a `dado` get a two-tone wall: a tiled lower
band up to `dadoHeight` (1.0 m) plus a thin wooden rail sitting on top of it,
built as two extra thin-instanced meshes over the same wall cells — the
underlying wall cube itself is untouched.

## Tier behaviour

Graphics tier is `getSettings().graphicsTier` (`niedrig` / `mittel` /
`hoch`, see [`client/src/rendering/ambience.ts`](../client/src/rendering/ambience.ts)
`TIERS`):

- **Niedrig** — nothing changes from before this work. Every archetype
  renders with the same flat `StandardMaterial` set (`/textures/floor.png`,
  `/textures/wall.png`, `/textures/ceiling.png`), no PBR maps, no dado/rail
  meshes, no decals, no environment texture.
- **Mittel** — PBR is on, textures load at `512` resolution, sampling is
  `NEAREST` with wrap addressing to keep the existing pixel look.
- **Hoch** — PBR at `1k` resolution, `TRILINEAR` sampling with 8×
  anisotropic filtering.

Texture path convention: `/textures/pbr/<category>/<map>-<res>.webp`, where
`<category>` is the archetype-specific directory name from the tuning table
(e.g. `wall_plaster_plain`, `floor_lino`), `<map>` is `albedo` | `normal` |
`orm`, and `<res>` is `1k` or `512`.

### Lazy per-archetype loading

`client/src/rendering/materials.ts` exposes `getRoomMaterials(archetype)`,
which builds and caches one `{ wall, floor, ceiling, dado?, rail? }`
material set **per archetype**, the first time that archetype is actually
requested. A map that never has a `chemistry_lab` room never loads a single
chemistry-lab texture. `client/src/world/builder.ts` buckets every floor and
wall cell by its inferred archetype and only calls `getRoomMaterials` for
archetypes that actually have cells on the current map, so texture loading
scales with the map's room mix, not with the full archetype list.

`materials.floor` / `materials.wall` / `materials.ceiling` keep working
exactly as before — other modules (`client/src/gameplay/doorBuilder.ts`,
for instance) still read them directly. When PBR is on they now point at
the `hallway` material set.

## ORM channel packing and the normal map convention

The `orm` texture packs occlusion in red, roughness in green, metalness in
blue (`useRoughnessFromMetallicTextureGreen = true`,
`useMetallnessFromMetallicTextureBlue = true`). The red (AO) channel is
**not** wired up (`useAmbientOcclusionFromMetallicTextureRed` stays off) —
AO is already baked into the albedo by the fetch script, and the
procedural grime `DynamicTexture` from the horror-ambience pass already
owns `ambientTexture` on every surface material. The `roughness` /
`metallic` scalars from the tuning table still multiply the map, so a
config edit can push a surface glossier or duller without touching a
texture.

Normal maps are OpenGL convention (Babylon's default), so
`invertNormalMapX` / `invertNormalMapY` are left `false`. Bump strength is
intentionally modest (`bumpTexture.level` ≈ 0.6) — the renderer runs a hard
pixelation pass, and strong normal maps band under that kind of
downsampling.

## Environment texture

On any tier with `pbrSurfaces` on, one `HDRCubeTexture`
(`/textures/pbr/hdri/creepy_bathroom_1k.hdr`, 128px) is loaded and assigned
to `scene.environmentTexture`. It's wrapped in a try/catch with an error
callback that falls back to no environment texture — a missing or failed
HDR download degrades the look, it doesn't break the game. Environment
intensity is low everywhere by default; damp floors (`toilet`, `cafeteria`)
get a higher `floorEnvironment` multiplier so wet lino/stone picks up a
faint sheen instead of looking flat-matte.

## Decals

Water-stain decals (`decal_leak` texture category) are placed per room
using that room's deterministic seed — a few per room, half on the ceiling
(random cell, random spin, random uniform scale) and half on a wall cell
next to the room's floor (positioned on the wall face, oriented toward the
room). All decal instances across the whole map share one thin-instanced
mesh and one material, built once via `getDecalMaterial()`. Decals are
skipped entirely on `niedrig`.

## Running the texture fetch script

Category textures aren't checked into the repo pre-baked — they're fetched
from CC0 sources by `tools/fetch_textures.py`:

```
server/.venv/Scripts/python.exe tools/fetch_textures.py
```

It's idempotent — re-running it skips anything already downloaded — pass
`--force` to re-fetch everything regardless. See
[`client/public/textures/pbr/LICENSES.md`](../client/public/textures/pbr/LICENSES.md)
for the CC0 licence list of everything it pulls in.
