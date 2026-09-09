from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.application.abstractions.oauth_provider import IOAuthProvider
from app.domain.accounts.oauth_identity import OAuthIdentity

SCOPES = "openid profile"


class OidcOAuthProvider(IOAuthProvider):
    def __init__(
        self,
        name: str,
        authorize_endpoint: str,
        token_endpoint: str,
        userinfo_endpoint: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        extra_authorize_params: dict[str, str] | None = None,
    ) -> None:
        self._name = name
        self._authorize_endpoint = authorize_endpoint
        self._token_endpoint = token_endpoint
        self._userinfo_endpoint = userinfo_endpoint
        self._client_id = client_id
        self._client_secret = client_secret
        self._redirect_uri = redirect_uri
        self._extra_authorize_params = extra_authorize_params or {}

    @property
    def name(self) -> str:
        return self._name

    @property
    def client_id(self) -> str:
        return self._client_id

    @property
    def client_secret(self) -> str:
        return self._client_secret

    def authorize_url(self, state: str, challenge: str) -> str:
        params = {
            "client_id": self._client_id,
            "redirect_uri": self._redirect_uri,
            "response_type": "code",
            "scope": SCOPES,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
        params.update(self._extra_authorize_params)
        return f"{self._authorize_endpoint}?{urlencode(params)}"

    async def exchange_code(self, code: str, verifier: str) -> dict:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self._redirect_uri,
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "code_verifier": verifier,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                self._token_endpoint, data=data,
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()

    async def fetch_userinfo(self, access_token: str) -> OAuthIdentity:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                self._userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            info = resp.json()
        return OAuthIdentity(
            subject=str(info.get("sub", "")),
            display_name=info.get("name") or info.get("given_name"),
        )
