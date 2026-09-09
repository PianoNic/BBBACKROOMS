from __future__ import annotations

import base64
import hashlib
import secrets

from app.domain.security.pkce_pair import PkcePair


class PkceGenerator:
    def create(self) -> PkcePair:
        verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
        digest = hashlib.sha256(verifier.encode()).digest()
        challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
        return PkcePair(verifier=verifier, challenge=challenge)
