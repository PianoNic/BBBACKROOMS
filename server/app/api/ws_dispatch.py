"""Per-packet dispatcher: routes a validated ClientPacket to its service."""
from __future__ import annotations

import asyncio
import secrets

from fastapi import WebSocket

from app.domain.lobby import ChatMessage, Lobby, PlayerConn
from app.schemas.packets import (
    ChairDropPkt, ChairPickupPkt, ChairThrowPkt, ChatSendPkt, DoorTogglePkt,
    GamblePlayPkt, LobbySettingsPkt, LockerOpenPkt, MovePkt, SetAvatarPkt,
    SetNamePkt, StartGamePkt, WebRTCSignalPkt, WebcamStatePkt,
    PickupCollectPkt, ReviveStartPkt, ReviveCancelPkt, UsePotionPkt,
    UseGogglesPkt, BackToLobbyPkt, SetCosmeticPkt, BuyCosmeticPkt, PingPkt,
)
from app.services.broadcast import broadcast
from app.services.laptop import handle_gamble_open, handle_gamble_play
from app.services.chairs import handle_drop, handle_pickup, handle_throw
from app.services.lobby_service import start_lobby, world_init_payload
from app.services.lockers import handle_open as handle_locker_open
from app.services.doors import handle_door_toggle
from app.services.back_to_lobby import handle_back_to_lobby
from app.services.pickups import handle_collect, handle_use_goggles, handle_use_potion
from app.services.pings import handle_ping
from app.services.revive import handle_revive_cancel, handle_revive_start
from app.services.quests import check_extraction, try_complete_spots
from app.services.signaling import broadcast_webcam_state, relay_signal
from app.services.shop import handle_buy_cosmetic, handle_set_cosmetic
from app.services.teacher_loop import ensure_teacher_loop


async def dispatch(ws: WebSocket, lobby: Lobby, me: PlayerConn, pkt) -> None:
    # Waiting-room packets first.
    if isinstance(pkt, ChatSendPkt):
        text = pkt.text.strip()
        if not text:
            return
        msg = ChatMessage(
            id=secrets.token_hex(3), author=me.id, text=text[:300],
            ts=asyncio.get_event_loop().time(),
        )
        lobby.chat.append(msg)
        if len(lobby.chat) > 200:
            lobby.chat = lobby.chat[-200:]
        await broadcast(lobby, {
            "type": "chat_message",
            "id": msg.id, "author": msg.author, "text": msg.text, "ts": msg.ts,
        })
        return
    if isinstance(pkt, SetNamePkt):
        new_name = pkt.name.strip()[:24] or me.name
        me.name = new_name
        await broadcast(lobby, {"type": "lobby_player_rename", "id": me.id, "name": new_name})
        return
    if isinstance(pkt, SetAvatarPkt):
        me.avatar = pkt.avatar
        await broadcast(lobby, {"type": "player_avatar", "id": me.id, "avatar": pkt.avatar})
        return
    # Cosmetics: equip works for everyone (incl. in-game); buy needs an account.
    if isinstance(pkt, SetCosmeticPkt):
        await handle_set_cosmetic(lobby, me, pkt.category, pkt.cosmeticId)
        return
    if isinstance(pkt, BuyCosmeticPkt):
        await handle_buy_cosmetic(lobby, me, pkt.cosmeticId)
        return
    if isinstance(pkt, WebRTCSignalPkt):
        await relay_signal(lobby, me, pkt.to, pkt.kind, pkt.data)
        return
    if isinstance(pkt, WebcamStatePkt):
        await broadcast_webcam_state(lobby, me, pkt.on)
        return
    if isinstance(pkt, LobbySettingsPkt):
        if me.id != lobby.admin_id or lobby.status != "waiting":
            return
        if pkt.maxPlayers is not None:
            lobby.max_players = max(
                len(lobby.conns), max(1, min(100, int(pkt.maxPlayers))),
            )
        if pkt.clearPassword:
            lobby.password = None
        elif pkt.password is not None:
            lobby.password = pkt.password or None
        if pkt.selectAllTeachers:
            lobby.selected_teacher_images = None
        elif pkt.selectedTeachers is not None:
            # Empty list = "picked mode, nothing selected yet" — keep it as []
            # rather than collapsing to None, which would silently flip the UI
            # back to random mode.
            lobby.selected_teacher_images = [
                s for s in pkt.selectedTeachers if isinstance(s, str)
            ]
        if pkt.mapSize is not None:
            from app.world.constants import MAP_SIZES
            allowed = set(MAP_SIZES.values())
            if pkt.mapSize in allowed:
                lobby.map_size = pkt.mapSize
        if pkt.objectiveCount is not None:
            lobby.objective_count = max(2, min(12, int(pkt.objectiveCount)))
        if pkt.clearMapSeed:
            lobby.map_seed = None
        elif pkt.mapSeed is not None:
            # Pydantic clamps to int already; cap to fit in 32-bit range
            # so the Python RNG never has to deal with absurd magnitudes.
            lobby.map_seed = max(0, min(2**31 - 1, int(pkt.mapSeed)))
        await broadcast(lobby, {
            "type": "lobby_settings",
            "maxPlayers": lobby.max_players,
            "hasPassword": lobby.password is not None,
            "selectedTeachers": lobby.selected_teacher_images,
            "mapSize": lobby.map_size,
            "mapSeed": lobby.map_seed,
            "objectiveCount": lobby.objective_count,
        })
        return
    if isinstance(pkt, StartGamePkt):
        if me.id != lobby.admin_id or lobby.status != "waiting":
            return
        # Tell every client to show a loading screen while we build the
        # world. Worldgen can take up to ~15s on big maps; running it on
        # a thread keeps other lobbies' event loops responsive.
        await broadcast(lobby, {"type": "world_gen_start"})
        await asyncio.to_thread(start_lobby, lobby)
        for p in list(lobby.conns.values()):
            try:
                await p.ws.send_json(world_init_payload(lobby, p))
            except Exception:
                pass
        ensure_teacher_loop(lobby)
        return

    # In-game packets — ignore until the world exists.
    if lobby.status != "running" or lobby.world is None:
        return
    if isinstance(pkt, MovePkt):
        me.x, me.z, me.yaw = pkt.x, pkt.z, pkt.yaw
        await broadcast(
            lobby,
            {"type": "player_state", "id": me.id, "x": me.x, "z": me.z, "yaw": me.yaw},
            exclude=me.id,
        )
        await try_complete_spots(lobby, me, require_interact=False)
        await check_extraction(lobby, me)
        return
    if pkt.type == "interact":
        await try_complete_spots(lobby, me, require_interact=True)
        return
    if pkt.type == "gamble_open":
        await handle_gamble_open(ws, lobby, me)
        return
    if isinstance(pkt, GamblePlayPkt):
        await handle_gamble_play(ws, lobby, me, pkt.laptopId, pkt.choice)
        return
    if isinstance(pkt, ChairPickupPkt):
        await handle_pickup(lobby, me, pkt.chairId)
        return
    if isinstance(pkt, ChairThrowPkt):
        await handle_throw(lobby, me, pkt.dirX, pkt.dirZ)
        return
    if isinstance(pkt, ChairDropPkt):
        await handle_drop(lobby, me)
        return
    if isinstance(pkt, PickupCollectPkt):
        await handle_collect(lobby, me, pkt.pickupId)
        return
    if isinstance(pkt, PingPkt):
        await handle_ping(lobby, me, pkt.x, pkt.z)
        return
    if isinstance(pkt, UsePotionPkt):
        await handle_use_potion(lobby, me)
    if isinstance(pkt, UseGogglesPkt):
        await handle_use_goggles(lobby, me)
    if isinstance(pkt, BackToLobbyPkt):
        await handle_back_to_lobby(lobby, me)
        return
    if isinstance(pkt, ReviveStartPkt):
        await handle_revive_start(lobby, me, pkt.targetId)
        return
    if isinstance(pkt, ReviveCancelPkt):
        await handle_revive_cancel(lobby, me)
        return
    if isinstance(pkt, LockerOpenPkt):
        await handle_locker_open(lobby, me, pkt.lockerId)
        return
    if isinstance(pkt, DoorTogglePkt):
        await handle_door_toggle(lobby, me, pkt.doorId)
        return
