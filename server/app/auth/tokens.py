from __future__ import annotations

from app.infrastructure.security.hmac_token_service import token_service


def issue(claims: dict, ttl_seconds: int) -> str:
    return token_service.issue(claims, ttl_seconds)


def verify(token: str) -> dict | None:
    return token_service.verify(token)


def issue_session(account_id: int) -> str:
    return token_service.issue_session(account_id)


def issue_ws_ticket(account_id: int) -> str:
    return token_service.issue_ws_ticket(account_id)


def read_account_id(token: str | None, kind: str) -> int | None:
    return token_service.read_account_id(token, kind)
