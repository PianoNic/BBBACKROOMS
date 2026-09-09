from __future__ import annotations

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.db.cosmetics_repo import cosmetics_repository
from app.db.engine import database_engine
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog, cosmetic_catalog
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository
from app.domain.lobbies.lobby_registry import ILobbyRegistry
from app.domain.world.challenges.laptop_challenge_factory import LaptopChallengeFactory
from app.domain.world.challenges.rpg_battle import RpgBattle
from app.game.ability_effects import AbilityEffects
from app.game.broadcaster import Broadcaster, broadcaster
from app.game.handlers.ability_handler import AbilityHandler
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
from app.game.handlers.status_handler import StatusHandler
from app.game.lobby_registry import lobby_registry
from app.game.packet_dispatcher import PacketDispatcher
from app.game.snapshot_loop import SnapshotLoop
from app.game.teacher_loop import TeacherLoop


class GameCore:
    def __init__(
        self,
        broadcaster: Broadcaster,
        lobby_registry: ILobbyRegistry,
        cosmetics: ICosmeticRepository,
        cosmetic_catalog: CosmeticCatalog,
        db_availability: IDatabaseAvailability,
    ) -> None:
        self.broadcaster = broadcaster
        self.noise_handler = NoiseHandler()
        self.chair_handler = ChairHandler(broadcaster, self.noise_handler)
        self.door_handler = DoorHandler(broadcaster, self.noise_handler)
        self.locker_handler = LockerHandler(broadcaster, self.noise_handler)
        self.pickup_handler = PickupHandler(broadcaster)
        self.hiding_handler = HidingHandler(broadcaster, self.noise_handler, self.chair_handler)
        self.revive_handler = ReviveHandler(broadcaster)
        self.quest_handler = QuestHandler(broadcaster, self.chair_handler)
        self.ping_handler = PingHandler(broadcaster)
        self.signaling_handler = SignalingHandler(broadcaster)
        self.ability_effects = AbilityEffects()
        self.ability_handler = AbilityHandler(broadcaster, self.ability_effects)
        self.status_handler = StatusHandler()
        self.challenge_factory = LaptopChallengeFactory()
        self.rpg_battle = RpgBattle()
        self.laptop_handler = LaptopHandler(broadcaster, self.challenge_factory, self.rpg_battle)
        self.cosmetic_handler = CosmeticHandler(broadcaster, cosmetics, cosmetic_catalog, db_availability)

        self.teacher_loop = TeacherLoop(
            lobby_registry, broadcaster, self.ability_handler, self.chair_handler,
            self.door_handler, self.noise_handler, self.pickup_handler,
            self.revive_handler, self.status_handler,
        )
        self.snapshot_loop = SnapshotLoop(lobby_registry, broadcaster)

        self.dispatcher = PacketDispatcher(
            broadcaster, self.chair_handler, self.door_handler, self.locker_handler,
            self.pickup_handler, self.hiding_handler, self.revive_handler,
            self.quest_handler, self.ping_handler, self.noise_handler,
            self.signaling_handler, self.laptop_handler, self.cosmetic_handler,
            self.teacher_loop, self.snapshot_loop,
        )


game_core = GameCore(
    broadcaster, lobby_registry, cosmetics_repository, cosmetic_catalog, database_engine,
)
