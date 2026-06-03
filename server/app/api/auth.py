"""OAuth login endpoints (optional accounts).

Flow: GET /auth/{provider}/login -> redirect to provider -> provider redirects
to GET /auth/{provider}/callback -> we set a signed session cookie and bounce
back to the SPA. /auth/me reports login state; /auth/ws-ticket mints a
short-lived token the client passes on the WebSocket so the live player links
to their account. Guests (no cookie/token) are unaffected everywhere.
"""
from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.auth import oauth, tokens
from app.config import settings
from app.db import accounts_repo
from app.db.engine import db_available

log = logging.getLogger("bbb.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE = "bbb_session"
OAUTH_COOKIE = "bbb_oauth"
OAUTH_TTL = 600  # seconds allowed to complete the provider round-trip


def _set_cookie(resp, name: str, value: str, max_age: int) -> None:
    resp.set_cookie(
        name, value, max_age=max_age, httponly=True,
        secure=settings.session_cookie_secure, samesite="lax", path="/",
    )


def _frontend_redirect(ok: bool) -> RedirectResponse:
    sep = "&" if "?" in settings.frontend_url else "?"
    target = f"{settings.frontend_url}{sep}login={'ok' if ok else 'error'}"
    return RedirectResponse(target, status_code=302)


@router.get("/providers")
async def providers():
    """Which login buttons the client should render."""
    return {"google": settings.google_enabled(), "microsoft": settings.microsoft_enabled()}


@router.get("/{provider}/login")
async def login(provider: str):
    p = oauth.get_provider(provider)
    if p is None:
        return JSONResponse({"error": "provider not configured"}, status_code=404)
    state = secrets.token_urlsafe(16)
    verifier, challenge = oauth.make_pkce()
    # Stash state + PKCE verifier in a signed, short-lived cookie — a stateless
    # CSRF guard that also survives multiple tabs (no server-side store needed).
    oauth_token = tokens.issue(
        {"kind": "oauth", "provider": provider, "state": state, "verifier": verifier},
        OAUTH_TTL,
    )
    resp = RedirectResponse(oauth.authorize_url(p, state, challenge), status_code=302)
    _set_cookie(resp, OAUTH_COOKIE, oauth_token, OAUTH_TTL)
    return resp


@router.get("/{provider}/callback")
async def callback(provider: str, request: Request, code: str | None = None, state: str | None = None):
    resp_fail = _frontend_redirect(False)
    resp_fail.delete_cookie(OAUTH_COOKIE, path="/")
    p = oauth.get_provider(provider)
    if p is None or not db_available():
        return resp_fail
    body = tokens.verify(request.cookies.get(OAUTH_COOKIE) or "")
    if (
        body is None
        or body.get("kind") != "oauth"
        or body.get("provider") != provider
        or not code
        or not state
        or body.get("state") != state
    ):
        return resp_fail
    try:
        token_resp = await oauth.exchange_code(p, code, body["verifier"])
        info = await oauth.fetch_userinfo(p, token_resp["access_token"])
        if not info["sub"]:
            return resp_fail
        acct = await accounts_repo.upsert_account(
            provider, info["sub"], info["email"], info["name"],
        )
        await accounts_repo.ensure_profile(acct.id)
    except Exception as exc:  # noqa: BLE001
        log.warning("OAuth callback failed (%s): %s", provider, exc)
        return resp_fail
    resp = _frontend_redirect(True)
    resp.delete_cookie(OAUTH_COOKIE, path="/")
    _set_cookie(resp, SESSION_COOKIE, tokens.issue_session(acct.id), settings.session_ttl_seconds)
    return resp


@router.get("/me")
async def me(request: Request):
    account_id = tokens.read_account_id(request.cookies.get(SESSION_COOKIE), "session")
    if account_id is None or not db_available():
        return {"account": None}
    return {"account": await accounts_repo.account_view(account_id)}


@router.post("/logout")
async def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(SESSION_COOKIE, path="/")
    return resp


@router.get("/ws-ticket")
async def ws_ticket(request: Request):
    account_id = tokens.read_account_id(request.cookies.get(SESSION_COOKIE), "session")
    if account_id is None:
        return JSONResponse({"error": "not authenticated"}, status_code=401)
    return {"ticket": tokens.issue_ws_ticket(account_id)}
