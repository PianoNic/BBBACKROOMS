"""Cloudflare Realtime TURN: mint short-lived ICE credentials.

The long-lived `TURN_TOKEN_ID` + `CLOUDFLARE_API_TOKEN` live only on the
backend. The browser calls `/api/turn-credentials` and receives a short-lived
username/credential pair plus the iceServers config — enough to open a
WebRTC connection, but useless after TTL elapses, so leaks are bounded.

We cache the minted response per-process for slightly less than its TTL so
a busy lobby doesn't hammer Cloudflare's API on every page refresh.
"""
from __future__ import annotations

import os
import time as _time

import httpx

CF_API_BASE = "https://rtc.live.cloudflare.com/v1/turn/keys"
TURN_TTL_SECONDS = 3600  # 1h — Cloudflare's max-recommended for clients
CACHE_REUSE_WINDOW = 3000  # serve cached creds during first ~50min of life

_cached: dict | None = None
_cached_at: float = 0.0


def _config() -> tuple[str, str] | None:
    tid = os.getenv("TURN_TOKEN_ID", "").strip()
    tok = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
    if not tid or not tok:
        return None
    return tid, tok


async def get_ice_servers() -> dict:
    """Returns {"iceServers": [...]} for RTCPeerConnection.

    If TURN env-vars are missing (e.g. dev without TURN), falls back to a
    public STUN-only config so the mesh still works for users with friendly
    NATs.
    """
    global _cached, _cached_at
    cfg = _config()
    if cfg is None:
        return {"iceServers": [{"urls": ["stun:stun.cloudflare.com:3478"]}]}
    now = _time.monotonic()
    if _cached is not None and (now - _cached_at) < CACHE_REUSE_WINDOW:
        return _cached
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
    _cached = data
    _cached_at = now
    return data
