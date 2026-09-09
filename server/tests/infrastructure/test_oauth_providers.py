from urllib.parse import parse_qs, urlparse

from app.infrastructure.configuration.settings import Settings
from app.infrastructure.oauth.google_oauth_provider import GoogleOAuthProvider
from app.infrastructure.oauth.microsoft_oauth_provider import MicrosoftOAuthProvider
from app.infrastructure.oauth.oauth_provider_factory import OAuthProviderFactory
from app.infrastructure.oauth.oidc_oauth_provider import SCOPES


def test_scopes_exclude_email():
    assert SCOPES == "openid profile"
    assert "email" not in SCOPES.split()


def test_factory_get_returns_none_for_unconfigured_and_unknown_providers():
    settings = Settings()
    factory = OAuthProviderFactory(settings)

    assert factory.get("google") is None
    assert factory.get("nonsense") is None


def test_google_authorize_url_carries_expected_params():
    provider = GoogleOAuthProvider("client-id", "client-secret", "http://localhost:8000/auth/google/callback")

    url = provider.authorize_url("st", "ch")
    query = parse_qs(urlparse(url).query)

    assert query["client_id"] == ["client-id"]
    assert query["redirect_uri"] == ["http://localhost:8000/auth/google/callback"]
    assert query["response_type"] == ["code"]
    assert query["scope"] == ["openid profile"]
    assert query["state"] == ["st"]
    assert query["code_challenge"] == ["ch"]
    assert query["code_challenge_method"] == ["S256"]
    assert "response_mode" not in query


def test_microsoft_authorize_url_additionally_carries_response_mode():
    provider = MicrosoftOAuthProvider(
        "client-id", "client-secret", "http://localhost:8000/auth/microsoft/callback", "common",
    )

    url = provider.authorize_url("st", "ch")
    query = parse_qs(urlparse(url).query)

    assert query["client_id"] == ["client-id"]
    assert query["redirect_uri"] == ["http://localhost:8000/auth/microsoft/callback"]
    assert query["response_type"] == ["code"]
    assert query["scope"] == ["openid profile"]
    assert query["state"] == ["st"]
    assert query["code_challenge"] == ["ch"]
    assert query["code_challenge_method"] == ["S256"]
    assert query["response_mode"] == ["query"]


def test_factory_enabled_is_false_by_default():
    settings = Settings()
    factory = OAuthProviderFactory(settings)

    assert factory.enabled() == {"google": False, "microsoft": False}
