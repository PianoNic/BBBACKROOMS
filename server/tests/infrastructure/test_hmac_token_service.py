from app.infrastructure.security.hmac_token_service import HmacTokenService


def _service() -> HmacTokenService:
    return HmacTokenService(b"test-secret", 3600, 60)


def test_session_round_trip():
    service = _service()
    token = service.issue_session(7)
    assert service.read_account_id(token, "session") == 7


def test_session_token_rejected_for_other_kind():
    service = _service()
    session_token = service.issue_session(7)
    ws_token = service.issue_ws_ticket(7)

    assert service.read_account_id(session_token, "ws") is None
    assert service.read_account_id(ws_token, "session") is None


def test_tampered_malformed_none_and_empty_tokens_read_as_none():
    service = _service()
    token = service.issue_session(7)
    payload_b64, _, sig = token.partition(".")
    tampered = f"{payload_b64}.{sig[:-1]}x"

    assert service.read_account_id(tampered, "session") is None
    assert service.read_account_id("not-a-token", "session") is None
    assert service.read_account_id(None, "session") is None
    assert service.read_account_id("", "session") is None


def test_expired_token_verifies_as_none():
    service = _service()
    token = service.issue({"sub": 7, "kind": "session"}, -1)

    assert service.verify(token) is None
