# Architecture

## Stack
- **Backend** — Python 3, FastAPI, Uvicorn, Pydantic v2, httpx, mediatorx. Authoritative state, worldgen, AI, signaling.
- **Frontend** — Vite, TypeScript, Babylon.js, SCSS, stats.js, lucide icons. Rendering, input, UI, audio, WebRTC peers.
- **Transports** — JSON packets over WebSocket for gameplay; WebRTC mesh (P2P) for webcam and proximity voice. The server is only a dumb-pipe relay for WebRTC.

## Onion layout (server)
```
server/app/
  domain/          entities, value objects, domain services, repository/gateway
                   interfaces — no FastAPI, no peewee, no imports from any
                   other ring
    accounts/, achievements/, cosmetics/, lobbies/, progression/,
    security/, world/ (worldgen + teacher AI)
  application/     mediatorx surface: commands/, queries/, notifications/,
    abstractions/  (repository/provider interfaces the handlers depend on),
    behaviors/     (LoggingBehavior, ExceptionLoggingBehavior),
    dtos/          (pydantic DTOs — the only pydantic below presentation)
  infrastructure/  concrete implementations behind the domain interfaces
    persistence/   peewee models, migrations, PeeweeAccountRepository & co.
    oauth/         GoogleOAuthProvider, MicrosoftOAuthProvider
    realtime/      CloudflareIceServerProvider, WebSocketPlayerChannel
    security/      HmacTokenService
    configuration/ Settings (pydantic-settings)
  game/            the real-time core: lobby_registry, packet_dispatcher,
                   broadcaster, teacher_loop, snapshot_loop, game_core
                   (composition of the above), handlers/ (one class per
                   interaction — chairs, doors, lockers, pickups, …)
  presentation/    FastAPI: controllers/, websocket/, dependencies.py
                   (the composition root), app_factory.py (create_app)
```
Dependencies point inward — `presentation` may import everything below it,
`game` depends on `domain` and `application`, `infrastructure` implements
`domain` interfaces, and `domain`/`application` never import outward (no
FastAPI, no peewee, no `app.infrastructure`/`app.presentation`/`app.game`).
The one exception is `presentation/dependencies.py`, the composition root,
which is the only place allowed to name concrete infrastructure classes.

Not everything goes through the mediator: the per-packet WebSocket path
(`move`, `chair_*`, `door_toggle`, `pickup_collect`, `ping`, `webrtc_signal`,
…), the `TeacherLoop`/`SnapshotLoop` tick loops, worldgen, and `Broadcaster`
fan-out all stay direct calls in `game/`. Movement alone is tens of packets
per second per player — a mediator `send` per packet would add a resolver
call and a behaviour chain to the tightest loop in the server for no
architectural gain, and the tick loops have no caller to return a response
to. Every HTTP endpoint and the rare orchestration-shaped game events
(`StartGameCommand`, `EndRoundCommand`, `BackToLobbyCommand`, …) go through
mediatorx instead, for logging, testability and a single place to add
cross-cutting behaviour. See [architecture-clean.md](architecture-clean.md)
for the full rationale.

## Frontend layout
```
client/src/
  main.ts        entry: title → connect → lobby → world → loop
  core/          gameLoop, input, audio, sceneSetup, settings, heartbeat
  rendering/     Babylon.js engine, materials, lights, ambience (fog,
                 vignette, exposure via imageProcessingConfiguration)
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
4. Admin sends `start_game` → server generates the world (`domain/world/generator.py`) and sends `world_init` with grid, spawns, lights, props, tasks, extraction point.
5. Client builds the Babylon.js scene from the grid and starts the game loop. The player sends `move` packets, the server validates and broadcasts snapshots.
6. Teacher loop runs server-side in the background (`game/teacher_loop.py`).
7. On extraction / death: `back_to_lobby` resets the lobby; players stay connected.

## Persistence
- Round/lobby state itself is never persisted — it lives in-process (`game/lobby_registry.py`'s `InMemoryLobbyRegistry`, held as `lobby_registry`). Restart = every lobby gone.
- The `had_game` flag prevents empty but already-played lobbies from being deleted immediately, so "Back to lobby" still works after a reload.
- Accounts, XP, coins and cosmetics *are* persisted, optionally, to PostgreSQL — see [persistence.md](persistence.md).

## Security model
- Server is authoritative for position, inventory, quests, teacher AI. The client only sends inputs.
- WebRTC payloads are not inspected by the server — only forwarded to the `to` peer in the same lobby.
- Cloudflare API token stays backend-side; the frontend only receives short-lived ICE credentials via `/turn-credentials`.
