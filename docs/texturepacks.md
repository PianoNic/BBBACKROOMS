# Texture packs

Texture packs let a player swap the teacher artwork (image + display name) they
see in the lobby, the start-of-game slot machine, and in-game, without
touching anything on the server. They are entirely client-side, entirely
local to one browser, and entirely optional.

## Installing one

Options → **TEXTURE PACKS** → **IMPORT PACK**, then pick a `.bbpack` file. The
pack is parsed, validated, hashed, and stored in this browser's IndexedDB
(`bbb_texture_packs` database, `packs` store). Nothing is uploaded anywhere.
From the same panel you can switch the active pack (**USE** / **ACTIVE**) or
remove one (**DELETE**).

## `.bbpack` layout

A pack is a single custom binary file: a small header, a JSON manifest, and
a sequence of named image assets, all in one container. There is no
general-purpose archive format involved — the layout is fixed and read with
explicit bounds checks. All multi-byte integers are little-endian.

| Offset | Size | Field |
|---|---|---|
| 0 | 4 | magic `BBPK` (ASCII 0x42 0x42 0x50 0x4B) |
| 4 | 2 | u16 format version, `1` |
| 6 | 2 | u16 reserved, `0` |
| 8 | 4 | u32 manifest length `N` |
| 12 | N | manifest JSON, UTF-8 (the `pack.json` schema below: `id`, `version`, `name`, `teachers`; `image` values are asset names) |
| 12+N | 4 | u32 asset count `K` |
| … | per asset | u16 name length, name (UTF-8), u8 mime length, mime (UTF-8), u32 data length, data |

Limits: a `.bbpack` file is at most 64 MB, holds at most 256 assets, and
every asset's mime type must be one of `image/jpeg`, `image/png`, or
`image/webp`.

## Building one in the browser

Options → **TEXTURE PACKS** → **PACK EDITOR** opens a zero-network, fully
client-side editor: pick a photo per teacher, fill in an id/version/name, and
either download the resulting `.bbpack` (named `<id>-<version>.bbpack`) or
install it directly into this browser. On first open you have to accept a
consent notice — only your own images, or images you have the subject's
permission for, may go into a pack — kept in memory for the session and
never written to storage.

Every picked image is processed entirely with `<canvas>`: center-cropped to a
square, resized to at most 1024 px on a side, and re-encoded as JPEG,
retrying at lower quality until it fits under 512 KB. The editor never makes
a network request itself; the only call in the whole flow is the one that
fetches the teacher roster when you click **PACK EDITOR**, and it completes
before the editor opens.

The `.bbpack` it produces follows the same layout described above — each
edited image is written as an asset named `teachers/<slug>.jpg` (the roster
filename, lowercased and slugified) — and each edited teacher always gets an
entry in the manifest's `teachers` map keyed by roster index, plus a second
entry keyed by that teacher's ability id when no earlier slot already claimed
that ability and the 256-entry cap still allows it, so the pack resolves
whichever lookup a given call site uses.

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
- `teachers` — a map of at most 256 entries. Each key is either a **roster
  index** (`"0"`, `"1"`, `"2"`, …) or a teacher **ability id** (e.g.
  `"silent_steps"`, `"lights_off"`, …). Each value has:
  - `image` (required) — the **asset name** inside the `.bbpack` container
    that holds the replacement image.
  - `name` (optional) — a replacement display name for that teacher.

Roster-index lookup wins over ability id lookup: it is the most specific
key, since it identifies one exact teacher slot. Ability id is the
fallback, used when no roster-index entry exists for that teacher, and the
default artwork is used only when neither lookup matches.

## Image constraints

Every referenced image must be:

- JPEG, PNG, or WebP (by file extension / MIME type),
- at most 512 KB,
- at most 1024 pixels on either side (checked with `createImageBitmap`).

Packs that don't meet these limits, or that have a malformed manifest, are
rejected with a specific error message shown in the settings panel — nothing
partial gets stored.

## The hash

Every stored pack has a **sha256 hash**, computed at import time over the
entire raw bytes of the `.bbpack` file — header, manifest, and every asset,
in the exact order they appear on disk (`crypto.subtle.digest("SHA-256",
bytes)`). It is never read from the manifest and never trusted from
anywhere else.

The result is a lowercase 64-character hex string. Because the hash covers
every byte of the file, it changes if a single pixel, a filename, or any
other byte changes — there's no way to keep the same `id` and `version`
while silently swapping content.

## The wire guarantee

When you're the lobby admin and have a pack selected locally, the client
announces only `pack_id` and `pack_hash` to the server (`pack_announce`),
which the server relays to everyone in the lobby (`lobby_pack` /
`lobby_state.packId` / `lobby_state.packHash`). No image bytes, no display
names, and no pack file content ever cross the network.

That means: to actually *see* the host's pack, another player must have the
exact same pack (matching `id` **and** `hash`) already imported in their own
browser — the client checks for a local match and only then swaps in the
pack's images and names. Anyone who doesn't have it installed keeps seeing
the default roster, plus a small indicator reading
`Host verwendet Pack <name> (nicht installiert)` — where `<name>` is the
announced pack id, since the pack's display name only exists inside the
pack file.

## Local-only, your responsibility

Texture packs are stored only in your own browser's IndexedDB — they aren't
uploaded, hosted, mirrored, or distributed by this project or its operator in
any way. If you create, share, or install a pack, the artwork and names in it
are entirely your own responsibility. Do not use real people's likenesses or
real school names/branding in a pack. The operator does not review, host, or
distribute pack content and takes no responsibility for what you put in one.
