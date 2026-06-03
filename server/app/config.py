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


settings = Settings()
