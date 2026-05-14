"""WebSocket connection lifecycle: accept, validate password, spawn dispatcher."""
from __future__ import annotations

import json
import secrets

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.ws_dispatch import dispatch
from app.domain.lobby import PlayerConn
from app.domain.lobby_store import delete_lobby, get_lobby
from app.schemas.packets import ClientPacketAdapter
from app.services.broadcast import broadcast
from app.services.lobby_service import lobby_room_state
from app.services.revive import cancel_revives_for


router = APIRouter()


@router.websocket("/ws/{lobby_id}")
async def ws_endpoint(ws: WebSocket, lobby_id: str) -> None:
    lobby = get_lobby(lobby_id)
    if lobby is None:
        await ws.close(code=4404)
        return
    if lobby.password is not None:
        supplied = ws.query_params.get("pwd", "")
        if supplied != lobby.password:
            await ws.close(code=4401)
            return
    if len(lobby.conns) >= lobby.max_players:
        await ws.close(code=4403)
        return
    if lobby.status != "waiting":
        await ws.close(code=4423)
        return
    await ws.accept()

    pid = secrets.token_hex(3)
    color = f"#{secrets.token_hex(3)}"
    name = f"player-{pid[:4]}"
    me = PlayerConn(id=pid, name=name, color=color, ws=ws)
    lobby.conns[pid] = me
    if lobby.admin_id is None:
        lobby.admin_id = pid

    await ws.send_json(lobby_room_state(lobby, pid))
    await broadcast(
        lobby,
        {"type": "lobby_player_join", "id": pid, "name": name, "color": color, "avatar": None},
        exclude=pid,
    )

    try:
        while True:
            data = await ws.receive_text()
            try:
                raw = json.loads(data)
                pkt = ClientPacketAdapter.validate_python(raw)
            except Exception:
                continue
            await dispatch(ws, lobby, me, pkt)
    except WebSocketDisconnect:
        pass
    finally:
        await cancel_revives_for(lobby, pid)
        lobby.conns.pop(pid, None)
        await broadcast(lobby, {"type": "player_leave", "id": pid})
        if lobby.admin_id == pid:
            lobby.admin_id = next(iter(lobby.conns), None)
            if lobby.admin_id:
                await broadcast(lobby, {"type": "lobby_admin_changed", "adminId": lobby.admin_id})
        # Auto-delete only brand-new empty lobbies. Once a round has been
        # started (had_game=True), keep the lobby parked so everyone can
        # reload back into it after "Back to lobby".
        if not lobby.conns and lobby.status == "waiting" and not lobby.had_game:
            delete_lobby(lobby.id)
