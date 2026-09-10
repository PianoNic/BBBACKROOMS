# Changelog

Entries below are generated from the project's [GitHub releases](https://github.com/PianoNic/BackroomsBaden/releases).

## v1.6.0 — 2026-09-09

- Add chemistry lab archetype with five new props
- Remove added code comments
- Replace real identity in the Moodle minigame
- Align prop reservations with rendered geometry

## v1.5.0 — 2026-09-09

- Plug the diagonal gap at grid-corner floor cells
- Fix docker pull command in release notes
- Fix hallway layout generating disconnected maps

## v1.5.0-alpha — 2026-09-09

- Keep avatar and cosmetics on revived players
- Redesign Moodle minigame to match the school LMS
- Add the RPG battle and Moodle quiz laptop minigames
- Add co-op objectives requiring 2 players together
- Expand shop catalog to 42 cosmetics
- Add teammate ping system on X key
- Fix fuse box: mount door and levers on the room-facing side
- Add noise system: teachers investigate heard sounds
- Add achievements with coin rewards
- Add 7 specialty props and 9 new objectives
- Add CC0 sound effects for all game actions
- Add state-based soundtrack, intro splash, and logo sting
- Add hide-in-closet mechanic to evade teachers
- Batch pose snapshots and encode broadcasts once
- Clear closets and hidden state on round reset
- Prefer a free closet over a nearer occupied one
- Return after handling potion and goggles packets
- Block chair throws from inside a closet
- Sub-step chair projectiles so they stop tunneling through targets
- Add server test suite covering recent fixes
- Add worldgen, pathfinding and teacher spawn tests
- Serve the built client from FastAPI in one image
- Add release pipeline publishing to GHCR
- Relicense under PolyForm Noncommercial and slim the README
