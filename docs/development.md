# Development

## Prerequisites
- Python 3.11+ (for FastAPI + Pydantic v2)
- [Bun](https://bun.sh) for the client. **Not npm.**
- Optional: Docker + Docker Compose for the container stack.
- Optional: PostgreSQL 16+ (or just Docker) — only for accounts / XP / cosmetics
  persistence. The game runs fine without it. See [persistence.md](persistence.md).

## Backend
```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
.\run.ps1
```
- Server: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws/{lobbyId}`
- Health: `GET /healthz` → `{"status":"ok"}`
- Version: `GET /version`

`run.ps1` applies database migrations (a no-op if no DB is configured), then
starts the app via `python -m app.asgi` with reload — code changes hot-reload
the worker. Launch this way (not a bare `uvicorn app.main:app`) so the Windows
Selector event-loop fix is applied; psycopg3's async pool needs it.

## Database (optional — accounts/XP/cosmetics)
Persistence is off by default and the game runs without it. To enable it, point
the backend at a PostgreSQL database via the `DB_*` env vars and run migrations.
Full guide, including the migration workflow: **[persistence.md](persistence.md)**.

```powershell
# quickest: a throwaway Postgres in Docker
docker run -d --name bbb-postgres -e POSTGRES_USER=bbb -e POSTGRES_PASSWORD=bbb -e POSTGRES_DB=bbb -p 5432:5432 postgres:16-alpine
cd server; .\run.ps1     # migrations run automatically on start
```

## Frontend
```powershell
cd client
bun install
bun run dev
```
Vite prints the URL (default `http://localhost:5173`). Build:
```powershell
bun run build      # tsc -b && vite build
bun run preview    # serves dist/
```

## Tests
Service-level tests for the server live in `server/tests`. They build `Lobby`
objects directly instead of going through a WebSocket, so they need no running
backend and no database.
```powershell
cd server
pip install -r requirements-dev.txt
pytest
```
`requirements-dev.txt` is deliberately separate: the Dockerfile installs only
`requirements.txt` and copies only `app/`, so the runtime image stays free of
the test toolchain.

## Building the image
One `Dockerfile` at the repo root builds everything — Bun compiles the client,
then the output is copied into the Python image as `app/static`:
```powershell
docker build -t ghcr.io/pianonic/bbbackrooms:dev .
```
Running the server from a source checkout has no `static/` directory, so it
serves the API only and Vite hosts the client — see [Frontend](#frontend).

## Configuration (`.env`)
Copy `.env.example` → `.env`:

| Variable | Effect |
| --- | --- |
| `PORT` | Host port the game is served on (default `5367`). |
| `TURN_TOKEN_ID` | Cloudflare Realtime TURN token ID. Required for webcam through restrictive NATs. |
| `CLOUDFLARE_API_TOKEN` | Paired Cloudflare API token. If either is missing → STUN-only fallback. |
| `DB_HOST` / `DB_PORT` | PostgreSQL host/port (default `127.0.0.1` / `5432`; `postgres` in compose). |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Database name/user/password (default `bbb`/`bbb`/`bbb`). |

DB vars are optional — omit them to run without persistence. See [persistence.md](persistence.md).

Get TURN credentials at *Cloudflare dashboard → Realtime → TURN Server → create app*.

## Docker
```powershell
docker compose up -d
```
- Pulls `ghcr.io/pianonic/bbbackrooms` — one image holding the API *and* the
  built client. FastAPI serves the SPA itself (`app.frontend()` in `main.py`),
  so there is no separate web server and no way to deploy a client and a
  server that disagree about the wire protocol.
- Starts a `postgres:18-alpine` service (data in the `bbb-pgdata` volume); the
  app waits for its healthcheck and runs migrations on start.
- Listens on `$PORT` (default `5367`), with a `/healthz` healthcheck (30s interval).
- Stop: `docker compose down` (add `-v` to also drop the database volume).

## Project conventions
- Backend: onion architecture. `api/` may import `services/`, `services/` may import `domain/`, **never the other way around**.
- Worldgen is deterministic via a seed (see `world/generator.py`) — log the seed when debugging.
- Client state is passive: the server is the source of truth. No client-side inventory without a server echo.
- Never inspect WebRTC payloads on the server — the server is a dumb pipe.

## Common issues
- **"Couldn't join" loop** → `sessionStorage.bbb_lobby_resume` points at a dead lobby. It's cleared automatically on failure; to reproduce manually, clear DevTools → Application → Session Storage.
- **Webcam tile stays black behind NAT** → TURN credentials missing in `.env`.
- **`bun install` writes `package-lock.json`** → you accidentally used npm. Delete the lock, keep `bun.lock`.
