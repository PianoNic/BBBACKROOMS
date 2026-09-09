from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from fastapi import FastAPI
from mediatorx import DictResolver, Mediator

from app.application.commands.complete_oauth_login_command import (
    CompleteOAuthLoginCommand,
    CompleteOAuthLoginHandler,
)
from app.application.commands.delete_account_command import DeleteAccountCommand, DeleteAccountHandler
from app.application.commands.issue_ws_ticket_command import IssueWsTicketCommand, IssueWsTicketHandler
from app.application.commands.start_oauth_login_command import StartOAuthLoginCommand, StartOAuthLoginHandler
from app.application.queries.get_current_account_query import GetCurrentAccountHandler, GetCurrentAccountQuery
from app.application.queries.get_oauth_providers_query import GetOAuthProvidersHandler, GetOAuthProvidersQuery
from app.domain.progression.level_calculator import LevelCalculator
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.domain.security.pkce_generator import PkceGenerator
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository
from app.infrastructure.security.hmac_token_service import HmacTokenService
from app.presentation.controllers.auth_controller import OAUTH_COOKIE, SESSION_COOKIE
from app.presentation.controllers.auth_controller import router as auth_router
from app.presentation.dependencies import get_mediator

from tests.application.test_auth_handlers import FakeOAuthProvider, FakeOAuthProviderFactory


def _build_mediator(engine, factory: FakeOAuthProviderFactory) -> Mediator:
    accounts = PeeweeAccountRepository(engine)
    profiles = PeeweeProfileRepository(engine)
    token_service = HmacTokenService(b"test-secret", 3600, 60)
    blocked_subject_policy = BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))
    levels = LevelCalculator()
    pkce_generator = PkceGenerator()

    resolver = DictResolver()
    resolver.add_factory(GetOAuthProvidersHandler, lambda: GetOAuthProvidersHandler(factory))
    resolver.add_factory(
        GetCurrentAccountHandler,
        lambda: GetCurrentAccountHandler(token_service, accounts, profiles, levels, engine),
    )
    resolver.add_factory(
        StartOAuthLoginHandler,
        lambda: StartOAuthLoginHandler(factory, token_service, pkce_generator),
    )
    resolver.add_factory(
        CompleteOAuthLoginHandler,
        lambda: CompleteOAuthLoginHandler(
            factory, token_service, accounts, profiles, blocked_subject_policy, engine,
        ),
    )
    resolver.add_factory(DeleteAccountHandler, lambda: DeleteAccountHandler(token_service, accounts, engine))
    resolver.add_factory(
        IssueWsTicketHandler,
        lambda: IssueWsTicketHandler(token_service, accounts, blocked_subject_policy, engine),
    )

    mediator = Mediator(resolver=resolver)
    mediator.register(GetOAuthProvidersQuery, GetOAuthProvidersHandler)
    mediator.register(GetCurrentAccountQuery, GetCurrentAccountHandler)
    mediator.register(StartOAuthLoginCommand, StartOAuthLoginHandler)
    mediator.register(CompleteOAuthLoginCommand, CompleteOAuthLoginHandler)
    mediator.register(DeleteAccountCommand, DeleteAccountHandler)
    mediator.register(IssueWsTicketCommand, IssueWsTicketHandler)
    return mediator


@pytest.fixture
def api_client_factory(account_engine):
    provider = FakeOAuthProvider("google")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    test_mediator = _build_mediator(account_engine, factory)

    def _build() -> httpx.AsyncClient:
        app = FastAPI()
        app.include_router(auth_router)
        app.dependency_overrides[get_mediator] = lambda: test_mediator
        transport = httpx.ASGITransport(app=app)
        return httpx.AsyncClient(transport=transport, base_url="http://testserver")

    return _build, PeeweeAccountRepository(account_engine), HmacTokenService(b"test-secret", 3600, 60)


async def test_providers_endpoint(api_client_factory):
    build_client, _accounts, _token_service = api_client_factory
    async with build_client() as client:
        resp = await client.get("/auth/providers")
        assert resp.json() == {"google": True, "microsoft": False}


async def test_me_without_cookie(api_client_factory):
    build_client, _accounts, _token_service = api_client_factory
    async with build_client() as client:
        resp = await client.get("/auth/me")
        assert resp.json() == {"account": None}


async def test_me_with_valid_session_returns_full_payload(api_client_factory):
    build_client, accounts, token_service = api_client_factory
    acct = await accounts.upsert("google", "sub-clean", "Hans Ueli")
    session_token = token_service.issue_session(acct.id)

    async with build_client() as client:
        client.cookies.set(SESSION_COOKIE, session_token)
        resp = await client.get("/auth/me")
        body = resp.json()
        assert list(body["account"].keys()) == [
            "accountId", "provider", "displayName", "xp", "coins", "level", "xpIntoLevel", "xpForNextLevel",
        ]
        assert body["account"]["accountId"] == acct.id


async def test_logout_clears_session_cookie(api_client_factory):
    build_client, _accounts, _token_service = api_client_factory
    async with build_client() as client:
        resp = await client.post("/auth/logout")
        assert resp.json() == {"ok": True}
        set_cookie = resp.headers.get("set-cookie", "")
        assert "bbb_session=" in set_cookie


async def test_delete_account_with_session(api_client_factory):
    build_client, accounts, token_service = api_client_factory
    acct = await accounts.upsert("google", "sub-clean", "Hans Ueli")
    session_token = token_service.issue_session(acct.id)

    async with build_client() as client:
        client.cookies.set(SESSION_COOKIE, session_token)
        resp = await client.request("DELETE", "/auth/account")
        assert resp.status_code == 204
        set_cookie = resp.headers.get("set-cookie", "")
        assert "bbb_session=" in set_cookie
        assert "Max-Age=0" in set_cookie

        assert await accounts.get(acct.id) is None

        client.cookies.set(SESSION_COOKIE, session_token)
        me_resp = await client.get("/auth/me")
        assert me_resp.json() == {"account": None}


async def test_delete_account_without_session_returns_401(api_client_factory):
    build_client, _accounts, _token_service = api_client_factory
    async with build_client() as client:
        resp = await client.request("DELETE", "/auth/account")
        assert resp.status_code == 401
        assert resp.json() == {"error": "not authenticated"}


async def test_ws_ticket_without_session_returns_401(api_client_factory):
    build_client, _accounts, _token_service = api_client_factory
    async with build_client() as client:
        resp = await client.get("/auth/ws-ticket")
        assert resp.status_code == 401


async def test_ws_ticket_for_blocked_account_returns_403(api_client_factory):
    build_client, accounts, token_service = api_client_factory
    acct = await accounts.upsert("google", "sub-blocked", "Hans Ueli")
    session_token = token_service.issue_session(acct.id)

    async with build_client() as client:
        client.cookies.set(SESSION_COOKIE, session_token)
        resp = await client.get("/auth/ws-ticket")
        assert resp.status_code == 403
        assert resp.json() == {"error": "account blocked"}


async def test_ws_ticket_for_clean_account_returns_ticket(api_client_factory):
    build_client, accounts, token_service = api_client_factory
    acct = await accounts.upsert("google", "sub-clean", "Hans Ueli")
    session_token = token_service.issue_session(acct.id)

    async with build_client() as client:
        client.cookies.set(SESSION_COOKIE, session_token)
        resp = await client.get("/auth/ws-ticket")
        assert resp.status_code == 200
        assert "ticket" in resp.json()


async def test_login_for_unconfigured_provider_returns_404(api_client_factory):
    build_client, _accounts, _token_service = api_client_factory
    async with build_client() as client:
        resp = await client.get("/auth/microsoft/login", follow_redirects=False)
        assert resp.status_code == 404
        assert resp.json() == {"error": "provider not configured"}


async def test_login_for_configured_provider_redirects_and_sets_cookie(api_client_factory):
    build_client, _accounts, _token_service = api_client_factory
    async with build_client() as client:
        resp = await client.get("/auth/google/login", follow_redirects=False)
        assert resp.status_code == 302
        assert resp.headers["location"].startswith("https://provider.example/google/authorize")
        set_cookie = resp.headers.get("set-cookie", "")
        assert f"{OAUTH_COOKIE}=" in set_cookie


async def _run_oauth_callback(account_engine, subject: str):
    provider = FakeOAuthProvider("google", subject=subject)
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    test_mediator = _build_mediator(account_engine, factory)

    app = FastAPI()
    app.include_router(auth_router)
    app.dependency_overrides[get_mediator] = lambda: test_mediator
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        login_resp = await client.get("/auth/google/login", follow_redirects=False)
        oauth_cookie = login_resp.cookies.get(OAUTH_COOKIE)
        client.cookies.set(OAUTH_COOKIE, oauth_cookie)

        query = parse_qs(urlparse(login_resp.headers["location"]).query)
        state = query["state"][0]

        return await client.get(
            "/auth/google/callback", params={"code": "c", "state": state}, follow_redirects=False,
        )


async def test_callback_for_blocked_subject(account_engine):
    resp = await _run_oauth_callback(account_engine, "sub-blocked")

    assert resp.status_code == 302
    assert "login=blocked" in resp.headers["location"]
    set_cookie_headers = resp.headers.get_list("set-cookie")
    assert not any(f"{SESSION_COOKIE}=" in h for h in set_cookie_headers)

    from app.infrastructure.persistence.models import Account
    rows = list(
        await Account.select()
        .where((Account.provider == "google") & (Account.provider_subject == "sub-blocked"))
        .aio_execute()
    )
    assert rows == []


async def test_callback_for_clean_subject(account_engine):
    resp = await _run_oauth_callback(account_engine, "sub-clean")

    assert resp.status_code == 302
    assert "login=ok" in resp.headers["location"]
    set_cookie_headers = resp.headers.get_list("set-cookie")
    assert any(f"{SESSION_COOKIE}=" in h for h in set_cookie_headers)
