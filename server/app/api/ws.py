"""WebSocket connection lifecycle: accept, validate password, spawn dispatcher."""
from __future__ import annotations

import asyncio
import json
import secrets

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.ws_dispatch import dispatch
from app.auth import tokens
from app.db.accounts_repo import get_account
from app.db.engine import db_available
from app.domain.lobby import PlayerConn
from app.domain.lobby_store import delete_lobby, get_lobby
from app.schemas.packets import ClientPacketAdapter
from app.services.broadcast import broadcast
from app.services.lobby_service import lobby_room_state
from app.services.revive import cancel_revives_for


# How long an empty lobby is kept around after the last player leaves, so
# everyone gets a chance to reload back in after Back-to-Lobby. After that
# the lobby is deleted regardless of `had_game`.
EMPTY_LOBBY_GRACE_S = 60.0


async def _delete_if_still_empty(lobby_id: str) -> None:
    await asyncio.sleep(EMPTY_LOBBY_GRACE_S)
    lobby = get_lobby(lobby_id)
    if lobby is not None and not lobby.conns:
        delete_lobby(lobby_id)


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
    # Optional account link: the client passes a short-lived ws-ticket from
    # /auth/ws-ticket. Guests send no token and are unaffected.
    account_id = tokens.read_account_id(ws.query_params.get("token"), "ws")
    linked_account_id: int | None = None
    if account_id is not None and db_available():
        acct = await get_account(account_id)
        if acct is not None:
            linked_account_id = acct.id
            if acct.display_name:
                name = acct.display_name
    me = PlayerConn(id=pid, name=name, color=color, ws=ws, account_id=linked_account_id)
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
        # Fresh empty lobbies that never started a round die immediately.
        # Parked ones (had_game) get a short grace period so players can
        # reload back in after Back-to-Lobby, then they're cleaned up too.
        if not lobby.conns:
            if lobby.status == "waiting" and not lobby.had_game:
                delete_lobby(lobby.id)
            else:
                asyncio.create_task(_delete_if_still_empty(lobby.id))
