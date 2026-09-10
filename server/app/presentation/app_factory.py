from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.infrastructure.configuration.settings import settings
from app.infrastructure.persistence.engine import database_engine
from app.presentation.controllers.announcements_controller import router as announcements_router
from app.presentation.controllers.auth_controller import router as auth_router
from app.presentation.controllers.health_controller import router as health_router
from app.presentation.controllers.lobbies_controller import router as lobbies_router
from app.presentation.controllers.roster_controller import router as roster_router
from app.presentation.controllers.shop_controller import router as shop_router
from app.presentation.controllers.turn_controller import router as turn_router
from app.presentation.websocket.game_web_socket_endpoint import router as ws_router

log = logging.getLogger("nachsitzen")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Open the async DB pool. Persistence is optional — the game runs without a
    # database; only accounts/progress need it, so this is best-effort.
    # Migrations run as a SEPARATE step (run.ps1 / the Docker CMD) rather than
    # here, to keep peewee-migrate's synchronous code off the async event loop.
    await database_engine.connect()
    yield
    await database_engine.disconnect()


def create_app() -> FastAPI:
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

    app.include_router(lobbies_router)
    app.include_router(roster_router)
    app.include_router(announcements_router)
    app.include_router(turn_router)
    app.include_router(auth_router)
    app.include_router(shop_router)
    app.include_router(ws_router)
    app.include_router(health_router)

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

    return app
