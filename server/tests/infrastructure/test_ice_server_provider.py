import httpx

import app.infrastructure.realtime.cloudflare_ice_server_provider as cloudflare_ice_server_provider_module
from app.infrastructure.realtime.cloudflare_ice_server_provider import CloudflareIceServerProvider


async def test_get_ice_servers_returns_stun_fallback_when_unconfigured(monkeypatch):
    monkeypatch.delenv("TURN_TOKEN_ID", raising=False)
    monkeypatch.delenv("CLOUDFLARE_API_TOKEN", raising=False)
    provider = CloudflareIceServerProvider()

    result = await provider.get_ice_servers()

    assert result == {"iceServers": [{"urls": ["stun:stun.cloudflare.com:3478"]}]}


async def test_get_ice_servers_posts_once_and_reuses_cache(monkeypatch):
    monkeypatch.setenv("TURN_TOKEN_ID", "token-id")
    monkeypatch.setenv("CLOUDFLARE_API_TOKEN", "api-token")
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"iceServers": [{"urls": ["turn:example.com"]}]})

    class FakeAsyncClient(httpx.AsyncClient):
        def __init__(self, *args, **kwargs) -> None:
            kwargs["transport"] = httpx.MockTransport(handler)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(cloudflare_ice_server_provider_module.httpx, "AsyncClient", FakeAsyncClient)
    provider = CloudflareIceServerProvider()

    first = await provider.get_ice_servers()
    second = await provider.get_ice_servers()

    assert len(calls) == 1
    assert first == {"iceServers": [{"urls": ["turn:example.com"]}]}
    assert second == first
