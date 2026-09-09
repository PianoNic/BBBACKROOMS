from __future__ import annotations

import httpx
from fastapi import FastAPI

from app.api import auth as auth_api
from app.auth import oauth, tokens
from app.db import accounts_repo
from app.db.models import (
    AchievementUnlock,
    Account,
    CosmeticEquipped,
    CosmeticOwnership,
    Profile,
)


def test_account_model_has_no_email():
    assert set(Account._meta.fields) == {
        "id", "provider", "provider_subject", "display_name", "created_at",
    }


def test_oauth_scopes_exclude_email():
    assert "email" not in oauth.SCOPES.split()
    assert oauth.SCOPES == "openid profile"


async def test_upsert_account_keeps_display_name_only(account_db):
    acct = await accounts_repo.upsert_account("google", "sub-1", "Hans Ueli")
    acct = await accounts_repo.upsert_account("google", "sub-1", "Hans U.")

    rows = list(await Account.select().aio_execute())
    assert len(rows) == 1
    assert rows[0].display_name == "Hans U."

    view = await accounts_repo.account_view(acct.id)
    assert "email" not in view
    assert "displayName" in view


async def test_delete_account_removes_cascaded_rows(account_db):
    acct = await accounts_repo.upsert_account("google", "sub-1", "Hans Ueli")
    await accounts_repo.ensure_profile(acct.id)
    await CosmeticOwnership.aio_create(account=acct.id, cosmetic_id="c1")
    await CosmeticEquipped.aio_create(account=acct.id, category="body", cosmetic_id="c1")
    await AchievementUnlock.aio_create(account=acct.id, achievement_id="a1")

    assert await accounts_repo.delete_account(acct.id) is True

    for Model in (Account, Profile, CosmeticOwnership, CosmeticEquipped, AchievementUnlock):
        assert list(await Model.select().aio_execute()) == []

    assert await accounts_repo.get_account(acct.id) is None


async def test_delete_account_endpoint_clears_session(account_db, monkeypatch):
    app = FastAPI()
    app.include_router(auth_api.router)
    monkeypatch.setattr(auth_api, "db_available", lambda: True)
    acct = await accounts_repo.upsert_account("google", "sub-1", "Hans Ueli")
    await accounts_repo.ensure_profile(acct.id)
    cookie = tokens.issue_session(acct.id)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        client.cookies.set(auth_api.SESSION_COOKIE, cookie)
        resp = await client.request("DELETE", "/auth/account")
        assert resp.status_code == 204
        set_cookie = resp.headers.get("set-cookie", "")
        assert "bbb_session=" in set_cookie
        assert "Max-Age=0" in set_cookie

        assert await accounts_repo.get_account(acct.id) is None

        client.cookies.set(auth_api.SESSION_COOKIE, cookie)
        me_resp = await client.get("/auth/me")
        assert me_resp.json() == {"account": None}


async def test_delete_account_endpoint_requires_session(account_db, monkeypatch):
    app = FastAPI()
    app.include_router(auth_api.router)
    monkeypatch.setattr(auth_api, "db_available", lambda: True)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.request("DELETE", "/auth/account")
        assert resp.status_code == 401
