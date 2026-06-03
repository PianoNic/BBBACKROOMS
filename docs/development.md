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

## Configuration (`.env`)
Copy `.env.example` → `.env`:

| Variable | Effect |
| --- | --- |
| `PORT` | Host port of the frontend container (default `5367`). |
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
- Pulls `pianonic/bbbackrooms-backend` and `pianonic/bbbackrooms-frontend`.
- Starts a `postgres:16-alpine` service (data in the `bbb-pgdata` volume); the
  backend waits for its healthcheck and runs migrations on start.
- Frontend listens on `$PORT` (default `5367`).
- Backend stays on the internal bridge network with a `/healthz` healthcheck (30s interval).
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
