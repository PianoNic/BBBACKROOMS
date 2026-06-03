"""Async-Peewee database engine (psycopg3 backend, pooled).

The game must run even when the database is down — accounts/persistence are
optional. So `connect()` is best-effort: on failure it logs and leaves
`db_available()` False, and the account features simply stay off.

NOTE: on Windows the process must use a Selector event loop (see app/asgi.py);
psycopg3's async pool cannot run on the default ProactorEventLoop.
"""
from __future__ import annotations

import logging

import peewee_async

from app.config import settings

log = logging.getLogger("bbb.db")

database = peewee_async.Psycopg3Database(
    database=settings.db_name,
    user=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
    pool_params={"min_size": settings.db_pool_min, "max_size": settings.db_pool_max},
)

_ready = False


def db_available() -> bool:
    """True once the async pool has connected successfully."""
    return _ready


async def connect() -> None:
    global _ready
    try:
        await database.aio_connect()
        _ready = True
        log.info("Database connected (%s:%s/%s)",
                 settings.db_host, settings.db_port, settings.db_name)
    except Exception as exc:  # noqa: BLE001 — DB is optional, never fatal
        _ready = False
        log.warning("Database unavailable — accounts/persistence disabled: %s", exc)


async def disconnect() -> None:
    global _ready
    if _ready:
        await database.aio_close()
        _ready = False
