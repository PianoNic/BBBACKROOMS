# `app/infrastructure/persistence` — persistence layer

Async-Peewee (psycopg3) + peewee-migrate. See [`docs/persistence.md`](../../../../docs/persistence.md)
for the full guide; this is the quick reference.

## Layout
- `engine.py` — `DatabaseEngine` (the shared async `database` object plus
  best-effort `connect()` / `disconnect()`, called from the app lifespan in
  `app/presentation/app_factory.py`) and the process-wide `database_engine`
  instance. `database_engine.is_available` reports whether the pool connected.
- `models.py` — `Account`, `Profile`, `CosmeticOwnership`, `CosmeticEquipped`,
  plus `ALL_MODELS`. Models subclass `peewee_async.AioModel`, so use the async
  `aio_*` methods at runtime.
- `migrate.py` — migration runner + CLI.
- `migrations/` — committed migration files.
- `repositories/` — `PeeweeAccountRepository`, `PeeweeProfileRepository`,
  `PeeweeCosmeticRepository`, `PeeweeAchievementRepository`, the concrete
  implementations behind the domain repository interfaces.

## Runtime queries (async)
```python
from app.infrastructure.persistence import models

acct = await models.Account.aio_create(provider="google", provider_subject=sub)
await models.Profile.aio_create(account=acct)
prof = await models.Profile.aio_get(models.Profile.account == acct.id)

from app.infrastructure.persistence.engine import database_engine
async with database_engine.database.aio_atomic():      # transaction
    prof.xp += 100
    await prof.aio_save()
```
Never call sync Peewee methods (`.get()`, `.create()`, …) at runtime — they
raise unless wrapped in `database_engine.database.allow_sync()`, which is
reserved for migrations.

## Migrations (sync, from `server/`)
```
python -m app.infrastructure.persistence.migrate run            # apply pending
python -m app.infrastructure.persistence.migrate list            # status
python -m app.infrastructure.persistence.migrate create <name>   # generate from models after editing them
```
After editing `models.py`, add the model to `ALL_MODELS`, run `create`, review
the generated file, `run` it, and commit it.
