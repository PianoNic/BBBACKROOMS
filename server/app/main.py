"""FastAPI app wiring.

Onion architecture:
    api/        — FastAPI routers (transport-level only)
    services/   — application logic (lobby start, quests, abilities, teacher AI)
    domain/     — pure entities (Lobby, PlayerConn, ChatMessage, ...)
    world/      — worldgen
    schemas/    — DTO models (packets, world payload)
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.http import router as http_router
from app.api.ws import router as ws_router


app = FastAPI(title="bbbackrooms server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(http_router)
app.include_router(ws_router)
