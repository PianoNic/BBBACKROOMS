"""WebSocket connection lifecycle: accept, validate password, spawn dispatcher."""
from __future__ import annotations

import asyncio
import json
import secrets

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.packets import ClientPacketAdapter
from app.domain.accounts.account_repository import IAccountRepository
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository
from app.domain.lobbies.player_conn import PlayerConn
from app.game.game_core import GameCore
from app.game.lobby_store import delete_lobby, get_lobby
from app.infrastructure.realtime.web_socket_player_channel import WebSocketPlayerChannel
from app.presentation.dependencies import (
    get_account_repository,
    get_cosmetic_catalog,
    get_cosmetic_repository,
    get_database_availability,
    get_game_core,
    get_token_service,
)


# How long an empty lobby is kept around after the last player leaves, so
# everyone gets a chance to reload back in after Back-to-Lobby. After that
# the lobby is deleted regardless of `had_game`.
EMPTY_LOBBY_GRACE_S = 60.0
MAX_WS_MESSAGE_BYTES = 64 * 1024


async def _delete_if_still_empty(lobby_id: str) -> None:
    await asyncio.sleep(EMPTY_LOBBY_GRACE_S)
    lobby = get_lobby(lobby_id)
    if lobby is not None and not lobby.conns:
        delete_lobby(lobby_id)


router = APIRouter()


@router.websocket("/ws/{lobby_id}")
async def ws_endpoint(
    ws: WebSocket,
    lobby_id: str,
    game_core: GameCore = Depends(get_game_core),
    token_service: ITokenService = Depends(get_token_service),
    accounts: IAccountRepository = Depends(get_account_repository),
    cosmetics: ICosmeticRepository = Depends(get_cosmetic_repository),
    cosmetic_catalog: CosmeticCatalog = Depends(get_cosmetic_catalog),
    db_availability: IDatabaseAvailability = Depends(get_database_availability),
) -> None:
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
    account_id = token_service.read_account_id(ws.query_params.get("token"), "ws")
    linked_account_id: int | None = None
    if account_id is not None and db_availability.is_available:
        acct = await accounts.get(account_id)
        if acct is not None:
            linked_account_id = acct.id
            if acct.display_name:
                name = acct.display_name
    me = PlayerConn(
        id=pid, name=name, color=color, channel=WebSocketPlayerChannel(ws),
        account_id=linked_account_id,
    )
    # Seed cosmetics: the account's owned/equipped, or the free defaults.
    if linked_account_id is not None and db_availability.is_available:
        try:
            me.owned_cosmetics = await cosmetics.get_owned(linked_account_id)
            me.equipped_cosmetics = await cosmetics.get_equipped(linked_account_id)
        except Exception:
            me.owned_cosmetics = cosmetic_catalog.default_ids()
            me.equipped_cosmetics = cosmetic_catalog.default_equipped()
    else:
        me.owned_cosmetics = cosmetic_catalog.default_ids()
        me.equipped_cosmetics = cosmetic_catalog.default_equipped()
    lobby.conns[pid] = me
    if lobby.admin_id is None:
        lobby.admin_id = pid

    await ws.send_json(game_core.lobby_state_builder.build(lobby, pid))
    me.ready = True  # only now may broadcasts reach this conn
    await game_core.broadcaster.broadcast(
        lobby,
        {
            "type": "lobby_player_join", "id": pid, "name": name, "color": color,
            "avatar": None, "equipped": me.equipped_cosmetics,
        },
        exclude=pid,
    )

    try:
        while True:
            data = await ws.receive_text()
            if len(data) > MAX_WS_MESSAGE_BYTES:
                continue
            try:
                raw = json.loads(data)
                pkt = ClientPacketAdapter.validate_python(raw)
            except Exception:
                continue
            await game_core.dispatcher.dispatch(ws, lobby, me, pkt)
    except WebSocketDisconnect:
        pass
    finally:
        await game_core.revive_handler.cancel_revives_for(lobby, pid)
        game_core.hiding_handler.free_hideout_for(lobby, pid)
        lobby.conns.pop(pid, None)
        await game_core.broadcaster.broadcast(lobby, {"type": "player_leave", "id": pid})
        if lobby.admin_id == pid:
            lobby.admin_id = next(iter(lobby.conns), None)
            if lobby.admin_id:
                await game_core.broadcaster.broadcast(
                    lobby, {"type": "lobby_admin_changed", "adminId": lobby.admin_id},
                )
        # Fresh empty lobbies that never started a round die immediately.
        # Parked ones (had_game) get a short grace period so players can
        # reload back in after Back-to-Lobby, then they're cleaned up too.
        if not lobby.conns:
            if lobby.status == "waiting" and not lobby.had_game:
                delete_lobby(lobby.id)
            else:
                asyncio.create_task(_delete_if_still_empty(lobby.id))
