# Architecture

## Stack
- **Backend** — Python 3, FastAPI, Uvicorn, Pydantic v2, httpx. Authoritative state, worldgen, AI, signaling.
- **Frontend** — Vite, TypeScript, Three.js, SCSS, stats.js, lucide icons. Rendering, input, UI, audio, WebRTC peers.
- **Transports** — JSON packets over WebSocket for gameplay; WebRTC mesh (P2P) for webcam and proximity voice. The server is only a dumb-pipe relay for WebRTC.

## Onion layout (server)
```
server/app/
  api/         FastAPI routers. Transport only — no logic.
    http.py        REST: /healthz, /version, /lobbies, /turn-credentials
    ws.py          WS lifecycle: auth, password, spawn, disconnect cleanup
    ws_dispatch.py packet → service dispatch
  services/    application logic
    lobby_service, quests, abilities, teacher_loop, signaling,
    revive, doors, lockers, chairs, pickups, laptop, broadcast, turn
  domain/      pure entities (Lobby, PlayerConn) — no FastAPI imports
  schemas/     Pydantic DTOs (packets.py = client→server, world.py = snapshot)
  world/       worldgen + teacher AI
    generator, layout, frame, decorate
    classroom, gym, atrium, cafeteria, toilet, server_room,
    janitor_room, teacher_room
    teacher_ai, teacher_events, teacher_roster, teacher_spawn, teachers
    pathfind, physics, geom, constants, pickups, quests
```

## Frontend layout
```
client/src/
  main.ts        entry: title → connect → lobby → world → loop
  core/          gameLoop, input, audio, sceneSetup, settings, heartbeat
  rendering/     Three.js renderer, materials, lights
  net/           WS client, packet router, protocol types, gamePackets
  world/         build world from server grid, props, colliders
  gameplay/      player, remotePlayers, teachers, doors, lockers, chairs,
                 laptops, pickups, quests, extraction, spectator,
                 webcam, proximityVoice, micProcessor, webrtcIce
  ui/            title, lobby, serverBrowser, HUD (compass, minimap,
                 stamina, taskboard, inventory), pauseMenu, settingsPanel,
                 reviveBar, jumpscare, victory, tutorialScreen,
                 laptop/ (Moodle, Teams, casino apps)
  styles/        SCSS
```

## Data flow
1. Client GETs `/lobbies` → server browser shows open lobbies.
2. Client opens `ws://…/ws/{lobbyId}?pwd=…`. Server assigns `pid`, `color`, broadcasts lobby state.
3. In the lobby room: players see webcam tiles (WebRTC mesh, signaling over WS), admin assigns teacher slots.
4. Admin sends `start_game` → server generates the world (`world/generator.py`) and sends `world_init` with grid, spawns, lights, props, tasks, extraction point.
5. Client builds the Three.js scene from the grid and starts the game loop. The player sends `move` packets, the server validates and broadcasts snapshots.
6. Teacher loop runs server-side in the background (`services/teacher_loop.py`).
7. On extraction / death: `back_to_lobby` resets the lobby; players stay connected.

## Persistence
- None. State lives in-process (`domain/lobby_store.py` is an in-memory dict). Restart = everything gone.
- The `had_game` flag prevents empty but already-played lobbies from being deleted immediately, so "Back to lobby" still works after a reload.

## Security model
- Server is authoritative for position, inventory, quests, teacher AI. The client only sends inputs.
- WebRTC payloads are not inspected by the server — only forwarded to the `to` peer in the same lobby.
- Cloudflare API token stays backend-side; the frontend only receives short-lived ICE credentials via `/turn-credentials`.
