import httpx
from fastapi import FastAPI
from mediatorx import DictResolver, Mediator

from app.application.commands.create_lobby_command import CreateLobbyCommand, CreateLobbyHandler
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.game.lobby_registry import InMemoryLobbyRegistry
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.security.hmac_token_service import HmacTokenService
from app.presentation.controllers.auth_controller import SESSION_COOKIE
from app.presentation.controllers.lobbies_controller import router as lobbies_router
from app.presentation.dependencies import get_mediator


async def test_create_lobby_refused_for_blocked_account(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    blocked_subject_policy = BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))
    registry = InMemoryLobbyRegistry()

    resolver = DictResolver()
    resolver.add_factory(
        CreateLobbyHandler,
        lambda: CreateLobbyHandler(token_service, accounts, blocked_subject_policy, account_engine, registry),
    )
    mediator = Mediator(resolver=resolver)
    mediator.register(CreateLobbyCommand, CreateLobbyHandler)

    acct = await accounts.upsert("google", "sub-blocked", "Hans Ueli")
    cookie = token_service.issue_session(acct.id)

    app = FastAPI()
    app.include_router(lobbies_router)
    app.dependency_overrides[get_mediator] = lambda: mediator
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        client.cookies.set(SESSION_COOKIE, cookie)
        resp = await client.post("/lobbies", json={"name": "test", "maxPlayers": 8})
        assert resp.status_code == 403

        client.cookies.clear()
        resp2 = await client.post("/lobbies", json={"name": "test2", "maxPlayers": 8})
        assert resp2.status_code == 200
