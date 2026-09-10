from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time

from app.application.abstractions.token_service import ITokenService
from app.infrastructure.configuration.settings import Settings, settings

log = logging.getLogger("nachsitzen.auth")


class HmacTokenService(ITokenService):
    def __init__(self, secret: bytes, session_ttl_seconds: int, ws_ticket_ttl_seconds: int) -> None:
        self._secret = secret
        self._session_ttl_seconds = session_ttl_seconds
        self._ws_ticket_ttl_seconds = ws_ticket_ttl_seconds

    @classmethod
    def from_settings(cls, settings: Settings) -> "HmacTokenService":
        if settings.session_secret:
            secret = settings.session_secret.encode()
        else:
            secret = secrets.token_bytes(32)
            log.warning("SESSION_SECRET not set — using an ephemeral key; sessions reset on restart")
        return cls(secret, settings.session_ttl_seconds, settings.ws_ticket_ttl_seconds)

    def _b64(self, raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    def _unb64(self, s: str) -> bytes:
        return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

    def _sign(self, payload_b64: str) -> str:
        return self._b64(hmac.new(self._secret, payload_b64.encode(), hashlib.sha256).digest())

    def issue(self, claims: dict, ttl_seconds: int) -> str:
        body = {**claims, "exp": int(time.time()) + ttl_seconds}
        payload_b64 = self._b64(json.dumps(body, separators=(",", ":")).encode())
        return f"{payload_b64}.{self._sign(payload_b64)}"

    def verify(self, token: str) -> dict | None:
        try:
            payload_b64, sig = token.split(".", 1)
        except (ValueError, AttributeError):
            return None
        if not hmac.compare_digest(sig, self._sign(payload_b64)):
            return None
        try:
            body = json.loads(self._unb64(payload_b64))
        except Exception:
            return None
        if int(body.get("exp", 0)) < int(time.time()):
            return None
        return body

    def issue_session(self, account_id: int) -> str:
        return self.issue({"sub": account_id, "kind": "session"}, self._session_ttl_seconds)

    def issue_ws_ticket(self, account_id: int) -> str:
        return self.issue({"sub": account_id, "kind": "ws"}, self._ws_ticket_ttl_seconds)

    def read_account_id(self, token: str | None, kind: str) -> int | None:
        if not token:
            return None
        body = self.verify(token)
        if body is None or body.get("kind") != kind:
            return None
        sub = body.get("sub")
        return sub if isinstance(sub, int) else None


token_service = HmacTokenService.from_settings(settings)
