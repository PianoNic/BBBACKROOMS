import logging

from mediatorx import DictResolver, Mediator

from app.application.behaviors.exception_logging_behavior import ExceptionLoggingBehavior
from app.application.behaviors.logging_behavior import LoggingBehavior
from app.application.commands.buy_cosmetic_command import BuyCosmeticCommand, BuyCosmeticHandler
from app.application.commands.complete_oauth_login_command import (
    CompleteOAuthLoginCommand,
    CompleteOAuthLoginHandler,
)
from app.application.commands.delete_account_command import DeleteAccountCommand, DeleteAccountHandler
from app.application.commands.equip_cosmetic_command import EquipCosmeticCommand, EquipCosmeticHandler
from app.application.commands.issue_ws_ticket_command import IssueWsTicketCommand, IssueWsTicketHandler
from app.application.commands.start_oauth_login_command import StartOAuthLoginCommand, StartOAuthLoginHandler
from app.application.queries.get_cosmetic_catalog_query import (
    GetCosmeticCatalogHandler,
    GetCosmeticCatalogQuery,
)
from app.application.queries.get_current_account_query import GetCurrentAccountHandler, GetCurrentAccountQuery
from app.application.queries.get_health_query import GetHealthHandler, GetHealthQuery
from app.application.queries.get_oauth_providers_query import (
    GetOAuthProvidersHandler,
    GetOAuthProvidersQuery,
)
from app.application.queries.get_shop_state_query import GetShopStateHandler, GetShopStateQuery
from app.application.queries.get_version_query import GetVersionHandler, GetVersionQuery
from app.domain.achievements.achievement_catalog import achievement_catalog
from app.domain.cosmetics.cosmetic_catalog import cosmetic_catalog
from app.domain.progression.level_calculator import LevelCalculator
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.domain.security.pkce_generator import PkceGenerator
from app.infrastructure.configuration.settings import settings
from app.infrastructure.oauth.oauth_provider_factory import OAuthProviderFactory
from app.infrastructure.persistence.engine import database_engine
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_achievement_repository import (
    PeeweeAchievementRepository,
)
from app.infrastructure.persistence.repositories.peewee_cosmetic_repository import PeeweeCosmeticRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository
from app.infrastructure.security.hmac_token_service import token_service
from app.version import VERSION

_log = logging.getLogger("bbb.mediator")


def build_mediator() -> Mediator:
    accounts = PeeweeAccountRepository(database_engine)
    profiles = PeeweeProfileRepository(database_engine)
    cosmetics = PeeweeCosmeticRepository(database_engine, cosmetic_catalog)
    achievements = PeeweeAchievementRepository(database_engine)
    provider_factory = OAuthProviderFactory(settings)
    blocked_subject_policy = BlockedSubjectPolicy.from_raw(settings.blocked_subjects)
    levels = LevelCalculator()
    pkce_generator = PkceGenerator()

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
    resolver.add_instance(ExceptionLoggingBehavior, ExceptionLoggingBehavior(_log))
    resolver.add_instance(LoggingBehavior, LoggingBehavior(_log))

    mediator = Mediator(resolver=resolver)
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
    mediator.add_behavior(ExceptionLoggingBehavior)
    mediator.add_behavior(LoggingBehavior)
    return mediator


_mediator = build_mediator()


def get_mediator() -> Mediator:
    return _mediator
