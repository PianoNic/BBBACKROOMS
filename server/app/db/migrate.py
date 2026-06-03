"""Database migrations via peewee-migrate.

Migrations are sync (peewee-migrate runs synchronous SQL). The async-Peewee
database forbids sync queries by default, so every migration call is wrapped in
`database.allow_sync()`.

Runtime:
    `run_migrations()` applies all pending migrations on startup.

Authoring (developer CLI), run from the `server/` directory:
    python -m app.db.migrate create <name>   # generate a migration from models
    python -m app.db.migrate run             # apply pending migrations
    python -m app.db.migrate list            # show migration status
"""
from __future__ import annotations

import logging
import os
import sys

from peewee_migrate import Router

from app.db import models  # noqa: F401 — ensure models are imported/registered
from app.db.engine import database

log = logging.getLogger("bbb.db")

MIGRATE_DIR = os.path.join(os.path.dirname(__file__), "migrations")


def _router() -> Router:
    return Router(database, migrate_dir=MIGRATE_DIR)


def run_migrations() -> None:
    """Apply all pending migrations. Sync — wrap in allow_sync."""
    with database.allow_sync():
        _router().run()
    log.info("Migrations applied")


def _create(name: str) -> None:
    # Pass the explicit model list (not the module) so the abstract BaseModel
    # isn't introspected into a spurious table.
    with database.allow_sync():
        _router().create(name=name, auto=models.ALL_MODELS)


def _list() -> None:
    with database.allow_sync():
        r = _router()
        print("done:", r.done)
        print("todo:", r.diff)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "run"
    if cmd == "create":
        _create(sys.argv[2] if len(sys.argv) > 2 else "auto")
    elif cmd == "list":
        _list()
    else:
        run_migrations()
