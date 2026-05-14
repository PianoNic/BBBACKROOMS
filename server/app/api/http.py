"""REST endpoints: health check, version, lobby browse & create."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.domain.lobby_store import create_lobby, list_lobbies
from app.services.turn import get_ice_servers
from app.version import VERSION

router = APIRouter()


class CreateLobbyReq(BaseModel):
    name: str = ""
    maxPlayers: int = 8
    password: str | None = None


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/version")
async def version() -> dict[str, str]:
    return {"version": VERSION}


@router.get("/lobbies")
async def get_lobbies() -> list[dict]:
    return [
        {
            "id": l.id, "name": l.name,
            "players": len(l.conns), "maxPlayers": l.max_players,
            "hasPassword": l.password is not None,
            "status": l.status,
        }
        for l in list_lobbies() if l.status == "waiting"
    ]


@router.get("/turn-credentials")
async def turn_credentials() -> dict:
    """Short-lived ICE servers config for the WebRTC mesh (webcam)."""
    return await get_ice_servers()


@router.post("/lobbies")
async def post_lobby(req: CreateLobbyReq) -> dict:
    l = create_lobby(req.name, max_players=req.maxPlayers, password=req.password)
    return {
        "id": l.id, "name": l.name,
        "players": 0, "maxPlayers": l.max_players,
        "hasPassword": l.password is not None,
    }
