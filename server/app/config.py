"""Typed application settings (first settings module in the project).

Values come from environment variables (injected by docker-compose, or loaded
from the repo-root `.env` by `run.ps1` for local dev). Database settings are
read here; OAuth/session settings are added alongside in the accounts stage.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    # Postgres connection. Defaults target a local dev database; compose
    # overrides DB_HOST=postgres (the service name on the internal network).
    db_host: str = "127.0.0.1"
    db_port: int = 5432
    db_name: str = "bbb"
    db_user: str = "bbb"
    db_password: str = "bbb"
    db_pool_min: int = 1
    db_pool_max: int = 8

    # --- OAuth (optional login). Empty client ids disable that provider. ---
    google_client_id: str = ""
    google_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_tenant: str = "common"
    # Public base URL of THIS backend; provider redirect URIs are
    # {oauth_redirect_base}/auth/{provider}/callback (must match the console).
    oauth_redirect_base: str = "http://localhost:8000"
    # Where the callback sends the browser back to after login (the SPA), and
    # the allowed CORS origin for credentialed requests.
    frontend_url: str = "http://localhost:5173"

    # --- Session ---
    # HMAC key for signing session + WS-ticket tokens. Leave empty in dev to
    # auto-generate an ephemeral key per process (sessions drop on restart);
    # set a stable 32+ byte value in production.
    session_secret: str = ""
    session_ttl_seconds: int = 2_592_000  # 30 days
    ws_ticket_ttl_seconds: int = 60
    # Set true in production (HTTPS). Must stay false for http://localhost dev.
    session_cookie_secure: bool = False

    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    def microsoft_enabled(self) -> bool:
        return bool(self.microsoft_client_id and self.microsoft_client_secret)


settings = Settings()
