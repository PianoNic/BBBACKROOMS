# Texture packs

Texture packs let a player swap the teacher artwork (image + display name) they
see in the lobby, the start-of-game slot machine, and in-game, without
touching anything on the server. They are entirely client-side, entirely
local to one browser, and entirely optional.

## Installing one

Options → **TEXTURE PACKS** → **IMPORT PACK**, then pick a `.zip` file. The
pack is parsed, validated, hashed, and stored in this browser's IndexedDB
(`bbb_texture_packs` database, `packs` store). Nothing is uploaded anywhere.
From the same panel you can switch the active pack (**USE** / **ACTIVE**) or
remove one (**DELETE**).

## Zip layout

A pack is a zip file containing a manifest, `pack.json`, plus the image files
it references, at whatever paths the manifest points to:

```
mypack.zip
├── pack.json
├── mr-smith.png
└── mrs-jones.webp
```

## Building one in the browser

Options → **TEXTURE PACKS** → **PACK EDITOR** opens a zero-network, fully
client-side editor: pick a photo per teacher, fill in an id/version/name, and
either download the resulting zip or install it directly into this browser.
On first open you have to accept a consent notice — only your own images, or
images you have the subject's permission for, may go into a pack — kept in
memory for the session and never written to storage.

Every picked image is processed entirely with `<canvas>`: center-cropped to a
square, resized to at most 1024 px on a side, and re-encoded as JPEG,
retrying at lower quality until it fits under 512 KB. The editor never makes
a network request itself; the only call in the whole flow is the one that
fetches the teacher roster when you click **PACK EDITOR**, and it completes
before the editor opens.

The zip it produces follows the same layout described above — each edited
image is written to `teachers/<slug>.jpg` (the roster filename, lowercased
and slugified) — and each edited teacher gets **two** entries in
`pack.json.teachers`: one keyed by roster index, and one keyed by that
teacher's ability id (as long as the 64-entry cap allows it), so the pack
resolves whichever lookup a given call site uses.

## `pack.json` schema

```json
{
  "id": "spooky-pack",
  "version": "1.0.0",
  "name": "Spooky Pack",
  "teachers": {
    "silent_steps": { "image": "mr-smith.png", "name": "Mr. Smith" },
    "0": { "image": "mrs-jones.webp" }
  }
}
```

- `id` — lowercase slug, `^[a-z0-9][a-z0-9-]{0,63}$`. This is the identifier
  announced to other players (see below), so keep it short and stable.
- `version`, `name` — free-text strings, capped at 64 characters each.
- `teachers` — a map of at most 64 entries. Each key is either a teacher
  **ability id** (e.g. `"silent_steps"`, `"lights_off"`, …) or a **roster
  index** (`"0"`, `"1"`, `"2"`, …) as a fallback for teachers looked up
  without a known ability. Each value has:
  - `image` (required) — a path inside the zip to the replacement image.
  - `name` (optional) — a replacement display name for that teacher.

Ability id lookup always wins over roster-index lookup.

## Image constraints

Every referenced image must be:

- JPEG, PNG, or WebP (by file extension / MIME type),
- at most 512 KB,
- at most 1024 pixels on either side (checked with `createImageBitmap`).

Packs that don't meet these limits, or that have a malformed manifest, are
rejected with a specific error message shown in the settings panel — nothing
partial gets stored.

## The hash

Every stored pack has a **sha256 hash**, computed at import time — it is
never read from `pack.json` and never trusted from anywhere else. It's
computed by:

1. listing every file actually present in the zip (not just the ones
   `pack.json` references),
2. sorting those files by their in-zip path, ascending,
3. for each file in that order, hashing its UTF-8-encoded path bytes
   followed by its raw file bytes,
4. concatenating all of that and running it through `SHA-256`
   (`crypto.subtle.digest`).

The result is a lowercase 64-character hex string. Because the hash covers
every file's bytes and path, it changes if a single pixel or filename
changes — there's no way to keep the same `id` and `version` while silently
swapping content.

## The wire guarantee

When you're the lobby admin and have a pack selected locally, the client
announces only `pack_id` and `pack_hash` to the server (`pack_announce`),
which the server relays to everyone in the lobby (`lobby_pack` /
`lobby_state.packId` / `lobby_state.packHash`). No image bytes, no display
names, and no zip content ever cross the network.

That means: to actually *see* the host's pack, another player must have the
exact same pack (matching `id` **and** `hash`) already imported in their own
browser — the client checks for a local match and only then swaps in the
pack's images and names. Anyone who doesn't have it installed keeps seeing
the default roster, plus a small indicator reading
`Host verwendet Pack <name> (nicht installiert)` — where `<name>` is the
announced pack id, since the pack's display name only exists inside the zip.

## Local-only, your responsibility

Texture packs are stored only in your own browser's IndexedDB — they aren't
uploaded, hosted, mirrored, or distributed by this project or its operator in
any way. If you create, share, or install a pack, the artwork and names in it
are entirely your own responsibility. Do not use real people's likenesses or
real school names/branding in a pack. The operator does not review, host, or
distribute pack content and takes no responsibility for what you put in one.
