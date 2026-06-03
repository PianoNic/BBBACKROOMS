# `app/db` — persistence layer

Async-Peewee (psycopg3) + peewee-migrate. See [`docs/persistence.md`](../../../docs/persistence.md)
for the full guide; this is the quick reference.

## Layout
- `engine.py` — the shared async `database` object and best-effort
  `connect()` / `disconnect()` (called from the app lifespan in `app/main.py`).
  `db_available()` reports whether the pool connected.
- `models.py` — `Account`, `Profile`, `CosmeticOwnership`, `CosmeticEquipped`,
  plus `ALL_MODELS`. Models subclass `peewee_async.AioModel`, so use the async
  `aio_*` methods at runtime.
- `migrate.py` — migration runner + CLI.
- `migrations/` — committed migration files.

## Runtime queries (async)
```python
from app.db import models

acct = await models.Account.aio_create(provider="google", provider_subject=sub)
await models.Profile.aio_create(account=acct)
prof = await models.Profile.aio_get(models.Profile.account == acct.id)

from app.db.engine import database
async with database.aio_atomic():      # transaction
    prof.xp += 100
    await prof.aio_save()
```
Never call sync Peewee methods (`.get()`, `.create()`, …) at runtime — they
raise unless wrapped in `database.allow_sync()`, which is reserved for
migrations.

## Migrations (sync, from `server/`)
```
python -m app.db.migrate run            # apply pending
python -m app.db.migrate list           # status
python -m app.db.migrate create <name>  # generate from models after editing them
```
After editing `models.py`, add the model to `ALL_MODELS`, run `create`, review
the generated file, `run` it, and commit it.
