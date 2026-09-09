"""FastAPI app wiring.

Onion architecture:
    api/        — FastAPI routers (transport-level only)
    services/   — application logic (lobby start, quests, abilities, teacher AI)
    domain/     — pure entities (Lobby, PlayerConn, ChatMessage, ...)
    world/      — worldgen
    schemas/    — DTO models (packets, world payload)
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.http import router as http_router
from app.api.shop import router as shop_router
from app.api.ws import router as ws_router
from app.config import settings
from app.db.engine import connect as db_connect
from app.db.engine import disconnect as db_disconnect

log = logging.getLogger("bbb")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Open the async DB pool. Persistence is optional — the game runs without a
    # database; only accounts/progress need it, so this is best-effort.
    # Migrations run as a SEPARATE step (run.ps1 / the Docker CMD) rather than
    # here, to keep peewee-migrate's synchronous code off the async event loop.
    await db_connect()
    yield
    await db_disconnect()


app = FastAPI(title="Backrooms Baden server", lifespan=lifespan)

# Credentialed auth (session cookie) requires a specific origin — the CORS spec
# forbids "*" with credentials. In dev that's the Vite origin (FRONTEND_URL); in
# production the SPA is typically same-origin behind the proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(http_router)
app.include_router(auth_router)
app.include_router(shop_router)
app.include_router(ws_router)

# Serve the built client from the same process, so one image ships the whole
# game. `app.frontend` wraps StaticFiles and adds the SPA fallback; routers
# registered above still win, so /healthz, /auth/*, /ws/* are unaffected.
#
# The directory only exists in the Docker image (the build stage drops the
# Vite output there). Running the server from a source checkout skips this —
# in dev the client is served by Vite on its own port, proxying back here.
if settings.static_dir.is_dir():
    app.frontend("/", directory=str(settings.static_dir), fallback="index.html")
    log.info("serving client from %s", settings.static_dir)
else:
    log.info("no client build at %s — API only (dev mode)", settings.static_dir)
