from __future__ import annotations

import httpx
from fastapi import FastAPI

from app.api import auth as auth_api
from app.api import http as http_api
from app.auth import tokens
from app.config import _parse_blocked_subjects
from app.db import accounts_repo
from app.db.models import Account


def test_parse_blocked_subjects_handles_empty_and_whitespace():
    assert _parse_blocked_subjects("") == frozenset()
    assert _parse_blocked_subjects("  ") == frozenset()
    assert _parse_blocked_subjects(" google:1234 , ,microsoft:abcd ,bogus, :x, y: ") == frozenset(
        {"google:1234", "microsoft:abcd"}
    )
    assert _parse_blocked_subjects("GOOGLE:AbC") == frozenset({"google:AbC"})


def test_is_subject_blocked_respects_list(monkeypatch):
    import app.config as config

    monkeypatch.setattr(config, "BLOCKED_SUBJECTS", frozenset({"google:sub-blocked"}))
    assert config.is_subject_blocked("google", "sub-blocked") is True
    assert config.is_subject_blocked("GOOGLE", "sub-blocked") is True
    assert config.is_subject_blocked("google", "sub-other") is False
    assert config.is_subject_blocked("microsoft", "sub-blocked") is False


async def test_ws_ticket_refused_for_blocked_account(account_db, monkeypatch):
    app = FastAPI()
    app.include_router(auth_api.router)
    monkeypatch.setattr(auth_api, "db_available", lambda: True)
    import app.config as config

    monkeypatch.setattr(config, "BLOCKED_SUBJECTS", frozenset({"google:sub-blocked"}))
    acct = await accounts_repo.upsert_account("google", "sub-blocked", "Hans Ueli")
    cookie = tokens.issue_session(acct.id)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        client.cookies.set(auth_api.SESSION_COOKIE, cookie)
        resp = await client.get("/auth/ws-ticket")
        assert resp.status_code == 403


async def test_ws_ticket_issued_for_unblocked_account(account_db, monkeypatch):
    app = FastAPI()
    app.include_router(auth_api.router)
    monkeypatch.setattr(auth_api, "db_available", lambda: True)
    import app.config as config

    monkeypatch.setattr(config, "BLOCKED_SUBJECTS", frozenset({"google:sub-blocked"}))
    acct = await accounts_repo.upsert_account("google", "sub-clean", "Hans Ueli")
    cookie = tokens.issue_session(acct.id)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        client.cookies.set(auth_api.SESSION_COOKIE, cookie)
        resp = await client.get("/auth/ws-ticket")
        assert resp.status_code == 200
        assert "ticket" in resp.json()


async def test_callback_blocked_subject_redirects_and_sets_no_cookie(account_db, monkeypatch):
    import app.config as config

    monkeypatch.setattr(config, "BLOCKED_SUBJECTS", frozenset({"google:sub-blocked"}))
    monkeypatch.setattr(auth_api, "db_available", lambda: True)

    class FakeProvider:
        pass

    monkeypatch.setattr(auth_api.oauth, "get_provider", lambda provider: FakeProvider())

    async def fake_exchange_code(p, code, verifier):
        return {"access_token": "t"}

    async def fake_fetch_userinfo(p, access_token):
        return {"sub": "sub-blocked", "name": "Hans Ueli"}

    monkeypatch.setattr(auth_api.oauth, "exchange_code", fake_exchange_code)
    monkeypatch.setattr(auth_api.oauth, "fetch_userinfo", fake_fetch_userinfo)

    app = FastAPI()
    app.include_router(auth_api.router)
    oauth_cookie = tokens.issue(
        {"kind": "oauth", "provider": "google", "state": "s", "verifier": "v"}, 600
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        client.cookies.set(auth_api.OAUTH_COOKIE, oauth_cookie)
        resp = await client.get(
            "/auth/google/callback", params={"code": "c", "state": "s"}, follow_redirects=False
        )
        assert resp.status_code == 302
        assert "login=blocked" in resp.headers["location"]
        set_cookie_headers = resp.headers.get_list("set-cookie")
        assert not any("bbb_session=" in h for h in set_cookie_headers)

    rows = list(
        await Account.select()
        .where((Account.provider == "google") & (Account.provider_subject == "sub-blocked"))
        .aio_execute()
    )
    assert rows == []


async def test_create_lobby_refused_for_blocked_account(account_db, monkeypatch):
    monkeypatch.setattr(http_api, "db_available", lambda: True)
    import app.config as config

    monkeypatch.setattr(config, "BLOCKED_SUBJECTS", frozenset({"google:sub-blocked"}))
    acct = await accounts_repo.upsert_account("google", "sub-blocked", "Hans Ueli")
    cookie = tokens.issue_session(acct.id)

    app = FastAPI()
    app.include_router(http_api.router)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        client.cookies.set(http_api.SESSION_COOKIE, cookie)
        resp = await client.post("/lobbies", json={"name": "test", "maxPlayers": 8})
        assert resp.status_code == 403

        client.cookies.clear()
        resp2 = await client.post("/lobbies", json={"name": "test2", "maxPlayers": 8})
        assert resp2.status_code == 200
