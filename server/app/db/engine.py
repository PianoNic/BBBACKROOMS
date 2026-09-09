from __future__ import annotations

from app.infrastructure.persistence.engine import database_engine

database = database_engine.database


def db_available() -> bool:
    return database_engine.is_available


async def connect() -> None:
    await database_engine.connect()


async def disconnect() -> None:
    await database_engine.disconnect()
