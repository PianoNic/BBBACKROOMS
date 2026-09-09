from app.application.commands.create_lobby_command import CreateLobbyCommand, CreateLobbyHandler
from app.application.queries.list_lobbies_query import ListLobbiesHandler, ListLobbiesQuery
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.game.lobby_registry import InMemoryLobbyRegistry
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.security.hmac_token_service import HmacTokenService


async def test_list_lobbies_maps_registry_state_to_dtos():
    registry = InMemoryLobbyRegistry()
    lobby = registry.create("test", max_players=8, password="secret")
    handler = ListLobbiesHandler(registry)

    result = await handler.handle(ListLobbiesQuery())

    assert len(result) == 1
    dto = result[0]
    assert dto.id == lobby.id
    assert dto.name == lobby.name
    assert dto.players == 0
    assert dto.max_players == 8
    assert dto.has_password is True
    assert dto.status == lobby.status


def _handler(account_engine, blocked_subject_policy: BlockedSubjectPolicy) -> CreateLobbyHandler:
    accounts = PeeweeAccountRepository(account_engine)
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    registry = InMemoryLobbyRegistry()
    return CreateLobbyHandler(token_service, accounts, blocked_subject_policy, account_engine, registry)


async def test_create_lobby_is_ok_for_guest(account_engine):
    handler = _handler(account_engine, BlockedSubjectPolicy(frozenset()))

    result = await handler.handle(CreateLobbyCommand(None, "test", 8, None))

    assert result.status == "ok"
    assert result.lobby is not None
    assert result.lobby.name == "test"


async def test_create_lobby_is_ok_for_unblocked_account(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    session_token = token_service.issue_session(acct.id)
    handler = _handler(account_engine, BlockedSubjectPolicy(frozenset()))

    result = await handler.handle(CreateLobbyCommand(session_token, "test", 8, None))

    assert result.status == "ok"


async def test_create_lobby_is_blocked_for_blocked_account(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    acct = await accounts.upsert("google", "sub-blocked", "Hans Ueli")
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    session_token = token_service.issue_session(acct.id)
    handler = _handler(account_engine, BlockedSubjectPolicy(frozenset({"google:sub-blocked"})))

    result = await handler.handle(CreateLobbyCommand(session_token, "test", 8, None))

    assert result.status == "blocked"
    assert result.lobby is None


async def test_create_lobby_skips_block_check_when_database_unavailable():
    accounts = PeeweeAccountRepository(None)
    token_service = HmacTokenService(b"test-secret", 3600, 60)

    class UnavailableEngine:
        @property
        def is_available(self) -> bool:
            return False

    registry = InMemoryLobbyRegistry()
    handler = CreateLobbyHandler(
        token_service, accounts, BlockedSubjectPolicy(frozenset({"google:sub-blocked"})),
        UnavailableEngine(), registry,
    )
    session_token = token_service.issue_session(1)

    result = await handler.handle(CreateLobbyCommand(session_token, "test", 8, None))

    assert result.status == "ok"
