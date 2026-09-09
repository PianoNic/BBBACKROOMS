# Persistence (accounts, XP, coins, cosmetics)

The game is playable with **no database** — accounts and saved progress are
optional. When a PostgreSQL database is configured, players who sign in get
their XP / level / coins / cosmetics persisted. Guests always work; if the DB
is down the server logs a warning and simply runs without persistence.

## Stack
- **PostgreSQL** (16+).
- **[peewee](http://docs.peewee-orm.com/)** models + **[peewee-async](https://github.com/05bit/peewee-async)** (psycopg3 backend) for async queries.
- **[peewee-migrate](https://github.com/klen/peewee_migrate)** for schema migrations.
- Settings via **pydantic-settings** (`app/infrastructure/configuration/settings.py`).

Code lives in [`server/app/infrastructure/persistence/`](../server/app/infrastructure/persistence/):

| File | Purpose |
| --- | --- |
| `engine.py` | `DatabaseEngine` — the async-Peewee `database` object + best-effort `connect()`/`disconnect()`. |
| `models.py` | ORM models: `Account`, `Profile`, `CosmeticOwnership`, `CosmeticEquipped`, `AchievementUnlock`. |
| `migrate.py` | Migration runner + authoring CLI. |
| `migrations/` | Generated migration files (committed to the repo). |
| `repositories/` | `PeeweeAccountRepository`, `PeeweeProfileRepository`, `PeeweeCosmeticRepository`, `PeeweeAchievementRepository` — the concrete implementations behind the domain repository interfaces. |

## What the `account` row stores
| Column | Notes |
| --- | --- |
| `id` | Surrogate key. |
| `provider` | `google` \| `microsoft`. |
| `provider_subject` | OIDC `sub`; `(provider, provider_subject)` is the unique natural key. |
| `display_name` | Provider display name; the default in-game player name. |
| `created_at` | First login. |

No email address is requested or stored (the OIDC scope is `openid profile`).
Progress lives in `profile`, `cosmetic_ownership`, `cosmetic_equipped` and
`achievement_unlock`, all `ON DELETE CASCADE` on `account`. `DELETE /auth/account`
removes the account and all of it — see [accounts.md](accounts.md).

## Configuration (env vars)
| Variable | Default | Notes |
| --- | --- | --- |
| `DB_HOST` | `127.0.0.1` | `postgres` inside docker-compose. |
| `DB_PORT` | `5432` | |
| `DB_NAME` | `bbb` | |
| `DB_USER` | `bbb` | |
| `DB_PASSWORD` | `bbb` | Change for any real deployment. |
| `DB_POOL_MIN` / `DB_POOL_MAX` | `1` / `8` | psycopg3 pool size. |

For local dev these are read from the repo-root `.env` (loaded by `run.ps1`).
docker-compose injects them and points the backend at the `postgres` service.

## Running a database locally

**Option A — docker-compose (everything):**
```powershell
docker compose up -d        # starts postgres + backend + frontend
```
The `postgres` service stores data in the `bbb-pgdata` volume and the backend
waits for its healthcheck before starting.

**Option B — just a Postgres container, app from source:**
```powershell
docker run -d --name bbb-postgres -e POSTGRES_USER=bbb -e POSTGRES_PASSWORD=bbb -e POSTGRES_DB=bbb -p 5432:5432 postgres:16-alpine
cd server
.\run.ps1                   # applies migrations, then starts the server
```

> If host port 5432 is taken, publish another (e.g. `-p 55432:5432`) and set
> `DB_PORT=55432` in `.env`.

## Migrations

Migrations run as a **separate synchronous step**, never inside the async event
loop. `run.ps1` and the Docker entrypoint both run them automatically before the
server starts; you can also run them by hand (from `server/`):

```powershell
python -m app.infrastructure.persistence.migrate run      # apply all pending migrations
python -m app.infrastructure.persistence.migrate list     # show applied / pending
python -m app.infrastructure.persistence.migrate create <name>   # generate a migration from models
```

**Workflow when you change `models.py`:**
1. Edit/add a model in `app/infrastructure/persistence/models.py` (and add it to `ALL_MODELS`).
2. `python -m app.infrastructure.persistence.migrate create <short_name>` — generates `migrations/NNN_<short_name>.py` by diffing the models against the DB.
3. Review the generated file, then `python -m app.infrastructure.persistence.migrate run` to apply.
4. Commit the new migration file.

## Windows note (important)
psycopg3's async pool **cannot run on Windows' default `ProactorEventLoop`**.
The app is launched via [`app/asgi.py`](../server/app/asgi.py), which installs a
`WindowsSelectorEventLoopPolicy` before the server starts; `run.ps1` launches in
reload mode, which also uses a Selector loop. On Linux (incl. the Docker image)
this is a no-op. **Always start the dev server with `run.ps1` / `python -m app.asgi`**,
not a bare `uvicorn app.main:app`, or the DB layer won't connect.
