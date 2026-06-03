"""Signed, expiring tokens (HMAC-SHA256) for the session cookie and the
short-lived WebSocket ticket.

Dependency-free (stdlib only). These sign OUR OWN claims — we never parse
provider ID-tokens (account identity comes from the provider userinfo endpoint
over TLS), so symmetric HMAC is all we need. `kind` separates session vs ticket
so one can't be substituted for the other.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time

from app.config import settings

log = logging.getLogger("bbb.auth")

# Stable key from config, or an ephemeral per-process key in dev (sessions then
# reset on restart — fine for local dev, never for production).
if settings.session_secret:
    _SECRET = settings.session_secret.encode()
else:
    _SECRET = secrets.token_bytes(32)
    log.warning("SESSION_SECRET not set — using an ephemeral key; sessions reset on restart")


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign(payload_b64: str) -> str:
    return _b64(hmac.new(_SECRET, payload_b64.encode(), hashlib.sha256).digest())


def issue(claims: dict, ttl_seconds: int) -> str:
    body = {**claims, "exp": int(time.time()) + ttl_seconds}
    payload_b64 = _b64(json.dumps(body, separators=(",", ":")).encode())
    return f"{payload_b64}.{_sign(payload_b64)}"


def verify(token: str) -> dict | None:
    try:
        payload_b64, sig = token.split(".", 1)
    except (ValueError, AttributeError):
        return None
    if not hmac.compare_digest(sig, _sign(payload_b64)):
        return None
    try:
        body = json.loads(_unb64(payload_b64))
    except Exception:
        return None
    if int(body.get("exp", 0)) < int(time.time()):
        return None
    return body


def issue_session(account_id: int) -> str:
    return issue({"sub": account_id, "kind": "session"}, settings.session_ttl_seconds)


def issue_ws_ticket(account_id: int) -> str:
    return issue({"sub": account_id, "kind": "ws"}, settings.ws_ticket_ttl_seconds)


def read_account_id(token: str | None, kind: str) -> int | None:
    """Return the account id from a valid token of the given kind, else None."""
    if not token:
        return None
    body = verify(token)
    if body is None or body.get("kind") != kind:
        return None
    sub = body.get("sub")
    return sub if isinstance(sub, int) else None
