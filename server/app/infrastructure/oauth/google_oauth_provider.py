from __future__ import annotations

from app.infrastructure.oauth.oidc_oauth_provider import OidcOAuthProvider


class GoogleOAuthProvider(OidcOAuthProvider):
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str) -> None:
        super().__init__(
            "google",
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            "https://openidconnect.googleapis.com/v1/userinfo",
            client_id,
            client_secret,
            redirect_uri,
        )
