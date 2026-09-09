"""Per-packet dispatcher: routes a validated ClientPacket to its service."""
from __future__ import annotations

import asyncio
import secrets

from mediatorx import Mediator

from app.domain.lobbies.chat_message import ChatMessage
from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_channel import IPlayerChannel
from app.domain.lobbies.player_conn import PlayerConn
from app.application.commands.back_to_lobby_command import BackToLobbyCommand
from app.application.commands.start_game_command import StartGameCommand
from app.application.dtos.packets import (
    ChairDropPkt, ChairPickupPkt, ChairThrowPkt, ChatSendPkt, DoorTogglePkt,
    GamblePlayPkt, LobbySettingsPkt, LockerOpenPkt, MovePkt, SetAvatarPkt,
    SetNamePkt, StartGamePkt, WebRTCSignalPkt, WebcamStatePkt,
    PickupCollectPkt, ReviveStartPkt, ReviveCancelPkt, UsePotionPkt,
    UseGogglesPkt, BackToLobbyPkt, SetCosmeticPkt, BuyCosmeticPkt, PingPkt,
    VoiceNoisePkt, HidePkt, PackAnnouncePkt,
)
from app.game.broadcaster import Broadcaster
from app.game.handlers.chair_handler import ChairHandler
from app.game.handlers.cosmetic_handler import CosmeticHandler
from app.game.handlers.door_handler import DoorHandler
from app.game.handlers.hiding_handler import HidingHandler
from app.game.handlers.laptop_handler import LaptopHandler
from app.game.handlers.locker_handler import LockerHandler
from app.game.handlers.noise_handler import NoiseHandler
from app.game.handlers.pickup_handler import PickupHandler
from app.game.handlers.ping_handler import PingHandler
from app.game.handlers.quest_handler import QuestHandler
from app.game.handlers.revive_handler import ReviveHandler
from app.game.handlers.signaling_handler import SignalingHandler
from app.game.lobby_state_builder import LobbyStateBuilder
from app.game.snapshot_loop import SnapshotLoop
from app.game.teacher_loop import TeacherLoop
from app.game.world_init_builder import WorldInitBuilder


class PacketDispatcher:
    def __init__(
        self,
        broadcaster: Broadcaster,
        chair_handler: ChairHandler,
        door_handler: DoorHandler,
        locker_handler: LockerHandler,
        pickup_handler: PickupHandler,
        hiding_handler: HidingHandler,
        revive_handler: ReviveHandler,
        quest_handler: QuestHandler,
        ping_handler: PingHandler,
        noise_handler: NoiseHandler,
        signaling_handler: SignalingHandler,
        laptop_handler: LaptopHandler,
        cosmetic_handler: CosmeticHandler,
        teacher_loop: TeacherLoop,
        snapshot_loop: SnapshotLoop,
        lobby_state_builder: LobbyStateBuilder,
        world_init_builder: WorldInitBuilder,
        mediator: Mediator | None = None,
    ) -> None:
        self._broadcaster = broadcaster
        self._chair_handler = chair_handler
        self._door_handler = door_handler
        self._locker_handler = locker_handler
        self._pickup_handler = pickup_handler
        self._hiding_handler = hiding_handler
        self._revive_handler = revive_handler
        self._quest_handler = quest_handler
        self._ping_handler = ping_handler
        self._noise_handler = noise_handler
        self._signaling_handler = signaling_handler
        self._laptop_handler = laptop_handler
        self._cosmetic_handler = cosmetic_handler
        self._teacher_loop = teacher_loop
        self._snapshot_loop = snapshot_loop
        self._lobby_state_builder = lobby_state_builder
        self._world_init_builder = world_init_builder
        self._mediator = mediator

    def set_mediator(self, mediator: Mediator) -> None:
        self._mediator = mediator

    async def dispatch(self, channel: IPlayerChannel, lobby: Lobby, player: PlayerConn, packet) -> None:
        me = player
        pkt = packet
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
            await self._broadcaster.broadcast(lobby, {
                "type": "chat_message",
                "id": msg.id, "author": msg.author, "text": msg.text, "ts": msg.ts,
            })
            return
        if isinstance(pkt, SetNamePkt):
            new_name = pkt.name.strip()[:24] or me.name
            me.name = new_name
            await self._broadcaster.broadcast(lobby, {"type": "lobby_player_rename", "id": me.id, "name": new_name})
            return
        if isinstance(pkt, SetAvatarPkt):
            me.avatar = pkt.avatar
            await self._broadcaster.broadcast(lobby, {"type": "player_avatar", "id": me.id, "avatar": pkt.avatar})
            return
        # Cosmetics: equip works for everyone (incl. in-game); buy needs an account.
        if isinstance(pkt, SetCosmeticPkt):
            await self._cosmetic_handler.handle_set_cosmetic(lobby, me, pkt.category, pkt.cosmeticId)
            return
        if isinstance(pkt, BuyCosmeticPkt):
            await self._cosmetic_handler.handle_buy_cosmetic(lobby, me, pkt.cosmeticId)
            return
        if isinstance(pkt, WebRTCSignalPkt):
            await self._signaling_handler.relay_signal(lobby, me, pkt.to, pkt.kind, pkt.data)
            return
        if isinstance(pkt, WebcamStatePkt):
            await self._signaling_handler.broadcast_webcam_state(lobby, me, pkt.on)
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
                from app.domain.world.constants import MAP_SIZES
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
            await self._broadcaster.broadcast(lobby, {
                "type": "lobby_settings",
                "maxPlayers": lobby.max_players,
                "hasPassword": lobby.password is not None,
                "selectedTeachers": lobby.selected_teacher_images,
                "mapSize": lobby.map_size,
                "mapSeed": lobby.map_seed,
                "objectiveCount": lobby.objective_count,
            })
            return
        if isinstance(pkt, PackAnnouncePkt):
            if me.id != lobby.admin_id:
                return
            if pkt.pack_id is None or pkt.pack_hash is None:
                lobby.pack_id = None
                lobby.pack_hash = None
            else:
                lobby.pack_id = pkt.pack_id
                lobby.pack_hash = pkt.pack_hash
            await self._broadcaster.broadcast(lobby, {
                "type": "lobby_pack",
                "packId": lobby.pack_id,
                "packHash": lobby.pack_hash,
            })
            return
        if isinstance(pkt, StartGamePkt):
            if me.id != lobby.admin_id or lobby.status != "waiting":
                return
            # Tell every client to show a loading screen while we build the
            # world. Worldgen can take up to ~15s on big maps; running it on
            # a thread keeps other lobbies' event loops responsive.
            await self._broadcaster.broadcast(lobby, {"type": "world_gen_start"})
            await self._mediator.send(StartGameCommand(lobby))
            for p in list(lobby.conns.values()):
                try:
                    await p.channel.send_json(self._world_init_builder.build(lobby, p))
                except Exception:
                    pass
            self._teacher_loop.ensure(lobby)
            self._snapshot_loop.ensure(lobby)
            return

        # In-game packets — ignore until the world exists.
        if lobby.status != "running" or lobby.world is None:
            return
        if isinstance(pkt, MovePkt):
            if me.hidden_in is not None:
                return  # pinned inside a closet — ignore movement
            me.x, me.z, me.yaw = pkt.x, pkt.z, pkt.yaw
            self._noise_handler.track_movement_noise(lobby, me)
            # No per-packet relay: the teacher tick batches every moved player
            # into a single `players_state` snapshot (see teacher_loop).
            me.pose_dirty = True
            await self._quest_handler.try_complete_spots(lobby, me, require_interact=False)
            await self._quest_handler.check_extraction(lobby, me)
            return
        if pkt.type == "interact":
            await self._quest_handler.try_complete_spots(lobby, me, require_interact=True)
            return
        if pkt.type == "gamble_open":
            await self._laptop_handler.handle_gamble_open(me.channel, lobby, me)
            return
        if isinstance(pkt, GamblePlayPkt):
            await self._laptop_handler.handle_gamble_play(me.channel, lobby, me, pkt.laptopId, pkt.choice)
            return
        if isinstance(pkt, ChairPickupPkt):
            await self._chair_handler.handle_pickup(lobby, me, pkt.chairId)
            return
        if isinstance(pkt, ChairThrowPkt):
            await self._chair_handler.handle_throw(lobby, me, pkt.dirX, pkt.dirZ)
            return
        if isinstance(pkt, ChairDropPkt):
            await self._chair_handler.handle_drop(lobby, me)
            return
        if isinstance(pkt, PickupCollectPkt):
            await self._pickup_handler.handle_collect(lobby, me, pkt.pickupId)
            return
        if isinstance(pkt, PingPkt):
            await self._ping_handler.handle_ping(lobby, me, pkt.x, pkt.z)
            return
        if isinstance(pkt, VoiceNoisePkt):
            self._noise_handler.handle_voice_noise(lobby, me)
            return
        if isinstance(pkt, HidePkt):
            await self._hiding_handler.handle_hide(lobby, me)
            return
        if isinstance(pkt, UsePotionPkt):
            await self._pickup_handler.handle_use_potion(lobby, me)
            return
        if isinstance(pkt, UseGogglesPkt):
            await self._pickup_handler.handle_use_goggles(lobby, me)
            return
        if isinstance(pkt, BackToLobbyPkt):
            did_reset = await self._mediator.send(BackToLobbyCommand(lobby, me))
            if did_reset:
                # Tell every connection the lobby is back in the waiting room so
                # each client can drop the victory overlay + tear down its game
                # scene.
                for p in list(lobby.conns.values()):
                    try:
                        await p.channel.send_json(self._lobby_state_builder.build(lobby, p.id))
                    except Exception:
                        # Connection died — `ws` cleanup will handle removal.
                        pass
            return
        if isinstance(pkt, ReviveStartPkt):
            await self._revive_handler.handle_revive_start(lobby, me, pkt.targetId)
            return
        if isinstance(pkt, ReviveCancelPkt):
            await self._revive_handler.handle_revive_cancel(lobby, me)
            return
        if isinstance(pkt, LockerOpenPkt):
            await self._locker_handler.handle_open(lobby, me, pkt.lockerId)
            return
        if isinstance(pkt, DoorTogglePkt):
            await self._door_handler.handle_door_toggle(lobby, me, pkt.doorId)
            return
