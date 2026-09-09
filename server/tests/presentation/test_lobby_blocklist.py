import httpx
from fastapi import FastAPI

from app.api import http as http_api
from app.auth import tokens
from app.db import accounts_repo
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository


async def test_create_lobby_refused_for_blocked_account(account_engine, monkeypatch):
    accounts = PeeweeAccountRepository(account_engine)
    monkeypatch.setattr(accounts_repo, "_accounts", accounts)
    monkeypatch.setattr(accounts_repo, "_blocklist", BlockedSubjectPolicy(frozenset({"google:sub-blocked"})))
    monkeypatch.setattr(http_api, "db_available", lambda: True)

    acct = await accounts.upsert("google", "sub-blocked", "Hans Ueli")
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
