import httpx
import pytest
from fastapi import FastAPI
from mediatorx import DictResolver, Mediator

from app.application.commands.create_lobby_command import CreateLobbyCommand, CreateLobbyHandler
from app.application.queries.list_lobbies_query import ListLobbiesHandler, ListLobbiesQuery
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.game.lobby_registry import InMemoryLobbyRegistry
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.security.hmac_token_service import HmacTokenService
from app.presentation.controllers.auth_controller import SESSION_COOKIE
from app.presentation.controllers.lobbies_controller import router as lobbies_router
from app.presentation.dependencies import get_mediator


def _build_mediator(engine, blocked_subject_policy: BlockedSubjectPolicy) -> Mediator:
    accounts = PeeweeAccountRepository(engine)
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    registry = InMemoryLobbyRegistry()

    resolver = DictResolver()
    resolver.add_factory(ListLobbiesHandler, lambda: ListLobbiesHandler(registry))
    resolver.add_factory(
        CreateLobbyHandler,
        lambda: CreateLobbyHandler(token_service, accounts, blocked_subject_policy, engine, registry),
    )

    mediator = Mediator(resolver=resolver)
    mediator.register(ListLobbiesQuery, ListLobbiesHandler)
    mediator.register(CreateLobbyCommand, CreateLobbyHandler)
    return mediator


@pytest.fixture
def api_client_factory(account_engine):
    def _build(blocked_subject_policy: BlockedSubjectPolicy = BlockedSubjectPolicy(frozenset())):
        test_mediator = _build_mediator(account_engine, blocked_subject_policy)
        app = FastAPI()
        app.include_router(lobbies_router)
        app.dependency_overrides[get_mediator] = lambda: test_mediator
        transport = httpx.ASGITransport(app=app)
        return httpx.AsyncClient(transport=transport, base_url="http://testserver")

    return _build, PeeweeAccountRepository(account_engine)


async def test_get_lobbies_returns_empty_list_for_empty_registry(api_client_factory):
    build_client, _accounts = api_client_factory
    async with build_client() as client:
        resp = await client.get("/lobbies")
        assert resp.json() == []


async def test_get_lobbies_element_keys_after_create(api_client_factory):
    build_client, _accounts = api_client_factory
    async with build_client() as client:
        await client.post("/lobbies", json={"name": "test", "maxPlayers": 8})
        resp = await client.get("/lobbies")
        body = resp.json()
        assert len(body) == 1
        assert list(body[0].keys()) == ["id", "name", "players", "maxPlayers", "hasPassword", "status"]


async def test_post_lobbies_returns_200_with_no_status_key(api_client_factory):
    build_client, _accounts = api_client_factory
    async with build_client() as client:
        resp = await client.post("/lobbies", json={"name": "test", "maxPlayers": 8})
        assert resp.status_code == 200
        body = resp.json()
        assert list(body.keys()) == ["id", "name", "players", "maxPlayers", "hasPassword"]
        assert "status" not in body


async def test_post_lobbies_for_blocked_account_returns_403(api_client_factory):
    build_client, accounts = api_client_factory
    acct = await accounts.upsert("google", "sub-blocked", "Hans Ueli")
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    session_token = token_service.issue_session(acct.id)

    async with build_client(BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))) as client:
        client.cookies.set(SESSION_COOKIE, session_token)
        resp = await client.post("/lobbies", json={"name": "test", "maxPlayers": 8})
        assert resp.status_code == 403
        assert resp.json() == {"error": "account blocked"}
