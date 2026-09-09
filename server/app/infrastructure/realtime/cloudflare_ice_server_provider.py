from __future__ import annotations

import os
import time as _time

import httpx

from app.application.abstractions.ice_server_provider import IIceServerProvider

CF_API_BASE = "https://rtc.live.cloudflare.com/v1/turn/keys"
TURN_TTL_SECONDS = 3600
CACHE_REUSE_WINDOW = 3000


class CloudflareIceServerProvider(IIceServerProvider):
    def __init__(self) -> None:
        self._cached: dict | None = None
        self._cached_at: float = 0.0

    def _config(self) -> tuple[str, str] | None:
        tid = os.getenv("TURN_TOKEN_ID", "").strip()
        tok = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
        if not tid or not tok:
            return None
        return tid, tok

    async def get_ice_servers(self) -> dict:
        cfg = self._config()
        if cfg is None:
            return {"iceServers": [{"urls": ["stun:stun.cloudflare.com:3478"]}]}
        now = _time.monotonic()
        if self._cached is not None and (now - self._cached_at) < CACHE_REUSE_WINDOW:
            return self._cached
        tid, tok = cfg
        url = f"{CF_API_BASE}/{tid}/credentials/generate-ice-servers"
        headers = {
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
        }
        body = {"ttl": TURN_TTL_SECONDS}
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(url, headers=headers, json=body)
            r.raise_for_status()
            data = r.json()
        self._cached = data
        self._cached_at = now
        return data
