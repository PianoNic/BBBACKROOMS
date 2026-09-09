from __future__ import annotations

from app.application.abstractions.oauth_provider import IOAuthProvider
from app.application.abstractions.oauth_provider_factory import IOAuthProviderFactory
from app.infrastructure.configuration.settings import Settings
from app.infrastructure.oauth.google_oauth_provider import GoogleOAuthProvider
from app.infrastructure.oauth.microsoft_oauth_provider import MicrosoftOAuthProvider


class OAuthProviderFactory(IOAuthProviderFactory):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _redirect_uri(self, name: str) -> str:
        return f"{self._settings.oauth_redirect_base}/auth/{name}/callback"

    def _build(self, name: str) -> IOAuthProvider | None:
        if name == "google":
            return GoogleOAuthProvider(
                self._settings.google_client_id,
                self._settings.google_client_secret,
                self._redirect_uri("google"),
            )
        if name == "microsoft":
            return MicrosoftOAuthProvider(
                self._settings.microsoft_client_id,
                self._settings.microsoft_client_secret,
                self._redirect_uri("microsoft"),
                self._settings.microsoft_tenant,
            )
        return None

    def get(self, name: str) -> IOAuthProvider | None:
        provider = self._build(name)
        if provider is None or not (provider.client_id and provider.client_secret):
            return None
        return provider

    def enabled(self) -> dict[str, bool]:
        return {"google": self._settings.google_enabled(), "microsoft": self._settings.microsoft_enabled()}
