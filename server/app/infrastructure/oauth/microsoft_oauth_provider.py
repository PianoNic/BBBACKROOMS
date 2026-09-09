from __future__ import annotations

from app.infrastructure.oauth.oidc_oauth_provider import OidcOAuthProvider


class MicrosoftOAuthProvider(OidcOAuthProvider):
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str, tenant: str) -> None:
        super().__init__(
            "microsoft",
            f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
            f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            "https://graph.microsoft.com/oidc/userinfo",
            client_id,
            client_secret,
            redirect_uri,
            {"response_mode": "query"},
        )
