# Worldgen

The world is generated server-side and deterministically on `start_game`, then shipped to all clients via `world_init`. Code lives under [`server/app/world/`](../server/app/world/).

## Pipeline
1. `generator.py` — top-level entry. Composes layout, rooms, decoration, teacher spawns, and tasks.
2. `layout.py` + `frame.py` — floor plan: rooms, corridors, doors.
3. Room modules (each builds walls, props, lights):
   - `classroom.py` + `classroom_desks.py` — classroom with desks, whiteboard, laptops.
   - `gym.py` — gym hall.
   - `atrium.py` — atrium (contains the extraction shaft).
   - `cafeteria.py` — cafeteria.
   - `toilet.py` — toilet block.
   - `server_room.py` — server room.
   - `janitor_room.py` — janitor room.
   - `teacher_room.py` — teachers' lounge.
4. `decorate.py` — scatter small props (lockers, trash cans, paintings, plants, radiators, …).
5. `pickups.py` + `quests.py` — place items in lockers, pick task objectives.
6. `teacher_spawn.py` + `teacher_roster.py` — draw teachers from the roster and spawn them at valid positions.

## Grid
- 2D cells, each `cellSize × cellSize` (default ~3.5 m).
- `cells[y * width + x]` encodes a wall/floor/door bitmask.
- The client builds instanced floor, ceiling, and wall meshes from it (`client/src/world/builder.ts`).

## Props
Full list in `client/src/net/protocol.ts` `PropType`. Examples:
desk, chair, student_desk, whiteboard, cupboard, closet, trash_can, painting, plant, toilet_stall, sink, bench, papers, laptop, urinal, bookshelf, clock, globe, swiss_flag, projector, bulletin_board, radiator, backpack, books_pile, fire_extinguisher, locker, floor_lamp, vending_machine.

The server only sends `{type, x, z, yaw}`. The client owns the geometry (`client/src/world/propBuilders/`).

## Teacher AI
- `teacher_ai.py` — per-tick logic (pathfinding, target selection, ability cooldown).
- `teacher_events.py` — triggers and sound events.
- `teacher_loop.py` (in `services/`) — drives the tick.
- `pathfind.py` — A* on the grid.
- `physics.py` — server-side collision.

Teacher roster: 25 portraits in `client/public/teachers/`. Each teacher has an ability (throw balls, hand out detention slips, freeze the floor, …) — see `services/abilities.py`.

## Tasks
Generated in `quests.py`:
- **Item tasks** — find a specific desk item and deliver it.
- **Laptop tasks** — solve a laptop mini-app (casino, Teams, or Moodle).

When all tasks are complete, `services/quests.py` unlocks the extraction in the atrium (glowing grate in the floor).

## Determinism
The generator takes a seed. For repro bugs, pull the seed out of the server log and re-use it in a test.
