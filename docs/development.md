# Development

## Prerequisites
- Python 3.11+ (for FastAPI + Pydantic v2)
- [Bun](https://bun.sh) for the client. **Not npm.**
- Optional: Docker + Docker Compose for the container stack.

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

`run.ps1` starts Uvicorn with reload — code changes hot-reload the worker.

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

Get TURN credentials at *Cloudflare dashboard → Realtime → TURN Server → create app*.

## Docker
```powershell
docker compose up -d
```
- Pulls `pianonic/bbbackrooms-backend` and `pianonic/bbbackrooms-frontend`.
- Frontend listens on `$PORT` (default `5367`).
- Backend stays on the internal bridge network with a `/healthz` healthcheck (30s interval).
- Stop: `docker compose down`.

## Project conventions
- Backend: onion architecture. `api/` may import `services/`, `services/` may import `domain/`, **never the other way around**.
- Worldgen is deterministic via a seed (see `world/generator.py`) — log the seed when debugging.
- Client state is passive: the server is the source of truth. No client-side inventory without a server echo.
- Never inspect WebRTC payloads on the server — the server is a dumb pipe.

## Common issues
- **"Couldn't join" loop** → `sessionStorage.bbb_lobby_resume` points at a dead lobby. It's cleared automatically on failure; to reproduce manually, clear DevTools → Application → Session Storage.
- **Webcam tile stays black behind NAT** → TURN credentials missing in `.env`.
- **`bun install` writes `package-lock.json`** → you accidentally used npm. Delete the lock, keep `bun.lock`.
