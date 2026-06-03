"""OAuth 2.0 Authorization-Code + PKCE flow for Google and Microsoft.

Hand-rolled with httpx (already a dependency). We do NOT verify provider
ID-token signatures; after exchanging the code over TLS we read identity from
the provider's userinfo endpoint over the same TLS channel, which is sufficient
for this app's threat model.
"""
from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.config import settings

SCOPES = "openid email profile"


@dataclass(frozen=True)
class Provider:
    name: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    client_id: str
    client_secret: str


def providers() -> dict[str, Provider]:
    t = settings.microsoft_tenant
    return {
        "google": Provider(
            "google",
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            "https://openidconnect.googleapis.com/v1/userinfo",
            settings.google_client_id,
            settings.google_client_secret,
        ),
        "microsoft": Provider(
            "microsoft",
            f"https://login.microsoftonline.com/{t}/oauth2/v2.0/authorize",
            f"https://login.microsoftonline.com/{t}/oauth2/v2.0/token",
            "https://graph.microsoft.com/oidc/userinfo",
            settings.microsoft_client_id,
            settings.microsoft_client_secret,
        ),
    }


def get_provider(name: str) -> Provider | None:
    p = providers().get(name)
    if p is None or not (p.client_id and p.client_secret):
        return None  # unknown or not configured
    return p


def redirect_uri(provider_name: str) -> str:
    return f"{settings.oauth_redirect_base}/auth/{provider_name}/callback"


def make_pkce() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) for PKCE S256."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def authorize_url(provider: Provider, state: str, challenge: str) -> str:
    params = {
        "client_id": provider.client_id,
        "redirect_uri": redirect_uri(provider.name),
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    if provider.name == "microsoft":
        params["response_mode"] = "query"
    return f"{provider.authorize_url}?{urlencode(params)}"


async def exchange_code(provider: Provider, code: str, verifier: str) -> dict:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri(provider.name),
        "client_id": provider.client_id,
        "client_secret": provider.client_secret,
        "code_verifier": verifier,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            provider.token_url, data=data,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_userinfo(provider: Provider, access_token: str) -> dict:
    """Return the normalized identity: {sub, email, name}."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            provider.userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        info = resp.json()
    return {
        "sub": str(info.get("sub", "")),
        "email": info.get("email"),
        "name": info.get("name") or info.get("given_name"),
    }
