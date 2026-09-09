import logging

from mediatorx import DictResolver, Mediator

from app.application.behaviors.exception_logging_behavior import ExceptionLoggingBehavior
from app.application.behaviors.logging_behavior import LoggingBehavior
from app.application.commands.back_to_lobby_command import BackToLobbyCommand, BackToLobbyHandler
from app.application.commands.buy_cosmetic_command import BuyCosmeticCommand, BuyCosmeticHandler
from app.application.commands.complete_oauth_login_command import (
    CompleteOAuthLoginCommand,
    CompleteOAuthLoginHandler,
)
from app.application.commands.create_lobby_command import CreateLobbyCommand, CreateLobbyHandler
from app.application.commands.delete_account_command import DeleteAccountCommand, DeleteAccountHandler
from app.application.commands.end_round_command import EndRoundCommand, EndRoundHandler
from app.application.commands.equip_cosmetic_command import EquipCosmeticCommand, EquipCosmeticHandler
from app.application.commands.issue_ws_ticket_command import IssueWsTicketCommand, IssueWsTicketHandler
from app.application.commands.start_game_command import StartGameCommand, StartGameHandler
from app.application.commands.start_oauth_login_command import StartOAuthLoginCommand, StartOAuthLoginHandler
from app.application.notifications.persist_rewards_handler import PersistRewardsHandler
from app.application.notifications.round_ended_notification import RoundEndedNotification
from app.application.notifications.unlock_achievements_handler import UnlockAchievementsHandler
from app.application.queries.get_cosmetic_catalog_query import (
    GetCosmeticCatalogHandler,
    GetCosmeticCatalogQuery,
)
from app.application.queries.get_current_account_query import GetCurrentAccountHandler, GetCurrentAccountQuery
from app.application.queries.get_health_query import GetHealthHandler, GetHealthQuery
from app.application.queries.get_ice_servers_query import GetIceServersHandler, GetIceServersQuery
from app.application.queries.get_oauth_providers_query import (
    GetOAuthProvidersHandler,
    GetOAuthProvidersQuery,
)
from app.application.queries.get_shop_state_query import GetShopStateHandler, GetShopStateQuery
from app.application.queries.get_teacher_roster_query import GetTeacherRosterHandler, GetTeacherRosterQuery
from app.application.queries.get_version_query import GetVersionHandler, GetVersionQuery
from app.application.queries.list_lobbies_query import ListLobbiesHandler, ListLobbiesQuery
from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.domain.accounts.account_repository import IAccountRepository
from app.domain.achievements.achievement_catalog import achievement_catalog
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog, cosmetic_catalog
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository
from app.domain.progression.achievement_evaluator import AchievementEvaluator
from app.domain.progression.level_calculator import LevelCalculator
from app.domain.progression.reward_calculator import RewardCalculator
from app.domain.progression.scoreboard_builder import ScoreboardBuilder
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.domain.security.pkce_generator import PkceGenerator
from app.domain.world.challenges.laptop_challenge_factory import LaptopChallengeFactory
from app.domain.world.generator import generate
from app.domain.world.pickups import fill_lockers
from app.domain.world.teachers import spawn_teachers
from app.game.game_core import GameCore, game_core
from app.game.lobby_registry import lobby_registry
from app.infrastructure.configuration.settings import settings
from app.infrastructure.oauth.oauth_provider_factory import OAuthProviderFactory
from app.infrastructure.persistence.engine import database_engine
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_achievement_repository import (
    PeeweeAchievementRepository,
)
from app.infrastructure.persistence.repositories.peewee_cosmetic_repository import PeeweeCosmeticRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository
from app.infrastructure.realtime.cloudflare_ice_server_provider import CloudflareIceServerProvider
from app.infrastructure.security.hmac_token_service import token_service
from app.version import VERSION
from app.domain.world.teacher_roster import TEACHER_ROSTER

_log = logging.getLogger("bbb.mediator")

accounts = PeeweeAccountRepository(database_engine)
cosmetics = PeeweeCosmeticRepository(database_engine, cosmetic_catalog)


def build_mediator() -> Mediator:
    profiles = PeeweeProfileRepository(database_engine)
    achievements = PeeweeAchievementRepository(database_engine)
    provider_factory = OAuthProviderFactory(settings)
    blocked_subject_policy = BlockedSubjectPolicy.from_raw(settings.blocked_subjects)
    levels = LevelCalculator()
    pkce_generator = PkceGenerator()
    ice_server_provider = CloudflareIceServerProvider()
    reward_calculator = RewardCalculator()
    scoreboard_builder = ScoreboardBuilder(reward_calculator, levels)
    achievement_evaluator = AchievementEvaluator()
    challenge_factory = LaptopChallengeFactory()

    resolver = DictResolver()
    resolver.add_factory(GetHealthHandler, lambda: GetHealthHandler())
    resolver.add_factory(GetVersionHandler, lambda: GetVersionHandler(VERSION))
    resolver.add_factory(GetOAuthProvidersHandler, lambda: GetOAuthProvidersHandler(provider_factory))
    resolver.add_factory(
        GetCurrentAccountHandler,
        lambda: GetCurrentAccountHandler(token_service, accounts, profiles, levels, database_engine),
    )
    resolver.add_factory(
        StartOAuthLoginHandler,
        lambda: StartOAuthLoginHandler(provider_factory, token_service, pkce_generator),
    )
    resolver.add_factory(
        CompleteOAuthLoginHandler,
        lambda: CompleteOAuthLoginHandler(
            provider_factory, token_service, accounts, profiles, blocked_subject_policy, database_engine,
        ),
    )
    resolver.add_factory(
        DeleteAccountHandler,
        lambda: DeleteAccountHandler(token_service, accounts, database_engine),
    )
    resolver.add_factory(
        IssueWsTicketHandler,
        lambda: IssueWsTicketHandler(token_service, accounts, blocked_subject_policy, database_engine),
    )
    resolver.add_factory(GetCosmeticCatalogHandler, lambda: GetCosmeticCatalogHandler(cosmetic_catalog))
    resolver.add_factory(
        GetShopStateHandler,
        lambda: GetShopStateHandler(token_service, cosmetics, profiles, cosmetic_catalog, database_engine),
    )
    resolver.add_factory(
        BuyCosmeticHandler,
        lambda: BuyCosmeticHandler(token_service, cosmetics, cosmetic_catalog, database_engine),
    )
    resolver.add_factory(
        EquipCosmeticHandler,
        lambda: EquipCosmeticHandler(token_service, cosmetics, cosmetic_catalog, database_engine),
    )
    resolver.add_factory(ListLobbiesHandler, lambda: ListLobbiesHandler(lobby_registry))
    resolver.add_factory(
        CreateLobbyHandler,
        lambda: CreateLobbyHandler(token_service, accounts, blocked_subject_policy, database_engine, lobby_registry),
    )
    resolver.add_factory(GetTeacherRosterHandler, lambda: GetTeacherRosterHandler(TEACHER_ROSTER))
    resolver.add_factory(GetIceServersHandler, lambda: GetIceServersHandler(ice_server_provider))
    resolver.add_factory(
        StartGameHandler,
        lambda: StartGameHandler(generate, spawn_teachers, fill_lockers, challenge_factory),
    )
    resolver.add_factory(BackToLobbyHandler, lambda: BackToLobbyHandler())
    resolver.add_factory(
        PersistRewardsHandler,
        lambda: PersistRewardsHandler(profiles, levels, database_engine),
    )
    resolver.add_factory(
        UnlockAchievementsHandler,
        lambda: UnlockAchievementsHandler(
            achievement_evaluator, achievements, achievement_catalog, profiles, database_engine,
        ),
    )
    resolver.add_instance(ExceptionLoggingBehavior, ExceptionLoggingBehavior(_log))
    resolver.add_instance(LoggingBehavior, LoggingBehavior(_log))

    mediator = Mediator(resolver=resolver)
    resolver.add_factory(EndRoundHandler, lambda: EndRoundHandler(scoreboard_builder, mediator))
    mediator.register(GetHealthQuery, GetHealthHandler)
    mediator.register(GetVersionQuery, GetVersionHandler)
    mediator.register(GetOAuthProvidersQuery, GetOAuthProvidersHandler)
    mediator.register(GetCurrentAccountQuery, GetCurrentAccountHandler)
    mediator.register(StartOAuthLoginCommand, StartOAuthLoginHandler)
    mediator.register(CompleteOAuthLoginCommand, CompleteOAuthLoginHandler)
    mediator.register(DeleteAccountCommand, DeleteAccountHandler)
    mediator.register(IssueWsTicketCommand, IssueWsTicketHandler)
    mediator.register(GetCosmeticCatalogQuery, GetCosmeticCatalogHandler)
    mediator.register(GetShopStateQuery, GetShopStateHandler)
    mediator.register(BuyCosmeticCommand, BuyCosmeticHandler)
    mediator.register(EquipCosmeticCommand, EquipCosmeticHandler)
    mediator.register(ListLobbiesQuery, ListLobbiesHandler)
    mediator.register(CreateLobbyCommand, CreateLobbyHandler)
    mediator.register(GetTeacherRosterQuery, GetTeacherRosterHandler)
    mediator.register(GetIceServersQuery, GetIceServersHandler)
    mediator.register(StartGameCommand, StartGameHandler)
    mediator.register(EndRoundCommand, EndRoundHandler)
    mediator.register(BackToLobbyCommand, BackToLobbyHandler)
    mediator.register_notification(RoundEndedNotification, PersistRewardsHandler)
    mediator.register_notification(RoundEndedNotification, UnlockAchievementsHandler)
    mediator.add_behavior(ExceptionLoggingBehavior)
    mediator.add_behavior(LoggingBehavior)
    return mediator


_mediator = build_mediator()
game_core.set_mediator(_mediator)


def get_mediator() -> Mediator:
    return _mediator


def get_game_core() -> GameCore:
    return game_core


def get_token_service() -> ITokenService:
    return token_service


def get_account_repository() -> IAccountRepository:
    return accounts


def get_cosmetic_repository() -> ICosmeticRepository:
    return cosmetics


def get_cosmetic_catalog() -> CosmeticCatalog:
    return cosmetic_catalog


def get_database_availability() -> IDatabaseAvailability:
    return database_engine
