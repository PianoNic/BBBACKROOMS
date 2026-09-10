# Materials

The world used to render with one flat texture each for floors, walls, and
ceilings, no matter what kind of room a player was standing in. This
overhauls that into a per-room-archetype material set — a classroom looks
different from a toilet block or a server room — while staying data-driven,
so retuning a room's look is a config edit, not a code change.

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

The full tuning table (exact tints, dado height, UV repeats) lives in
[`client/src/rendering/ambience.ts`](../client/src/rendering/ambience.ts)
under `AMBIENCE.materials` — nothing archetype-specific is hardcoded in the
material-building code itself, so retuning a room's look is a config edit,
not a code change. Rooms with a `dado` get a two-tone wall: a tiled lower
band up to `dadoHeight` (1.0 m) plus a thin wooden rail sitting on top of it,
built as two extra thin-instanced meshes over the same wall cells — the
underlying wall cube itself is untouched.

## One material set, one render profile

Every archetype surface — wall, floor, ceiling, and where present dado/rail —
is a single `StandardMaterial` built from one `512`px albedo WebP
(`/textures/pbr/<category>/albedo-512.webp`); there is no normal map, no
ORM/roughness/metalness map, and no HDRI environment texture. The archetype's
tint from the tuning table multiplies the albedo (`diffuseColor`), and
`maxSimultaneousLights = 1` on every material, matching the single
`HemisphericLight` that lights the whole scene (see [Architecture](architecture.md)).
Static world materials are frozen (`material.freeze()`) once their shader has
compiled, and `scene.freezeActiveMeshes()` runs once the world and any
lazily-loaded props are placed — dynamic meshes (players, doors, chairs, …)
opt out via `alwaysSelectAsActiveMesh = true` so they keep updating.

Texture path convention: `/textures/pbr/<category>/albedo-512.webp`, where
`<category>` is the archetype-specific directory name from the tuning table
(e.g. `wall_plaster_plain`, `floor_lino`).

<!--SHEEN-->Some tile floors (`toilet`, `cafeteria`, `chemistry_lab`) get a very
cheap sheen on top of the flat albedo: a tiny procedural cube texture is used
as `reflectionTexture` together with a Fresnel term, so wet-looking tile and
stone floors pick up a faint reflective highlight instead of looking
completely matte, without the cost of a real environment texture.

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
for instance) still read them directly, and point at the `hallway` material
set.

## Decals

Water-stain decals (`decal_leak` texture category) are placed per room
using that room's deterministic seed — a few per room, half on the ceiling
(random cell, random spin, random uniform scale) and half on a wall cell
next to the room's floor (positioned on the wall face, oriented toward the
room). All decal instances across the whole map share one thin-instanced
mesh and one material, built once via `getDecalMaterial()`.

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
