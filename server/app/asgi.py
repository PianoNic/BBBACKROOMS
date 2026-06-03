"""ASGI entrypoint.

Importing this module installs a Selector event-loop policy on Windows BEFORE
the ASGI server creates its loop. psycopg3's async pool cannot run on Windows'
default ProactorEventLoop, so without this the database layer fails to connect
in local dev. On Linux/macOS (including the Docker image) the guard is a no-op
and the server's normal loop (or uvloop) is used.

Point your ASGI server at `app.asgi:app`:

    uvicorn app.asgi:app            # production / manual
    python -m app.asgi             # local dev (reload)
"""
from __future__ import annotations

import asyncio
import sys

# Must happen before uvicorn / psycopg create the event loop.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.main import app  # noqa: E402  — import after the loop policy is set

__all__ = ["app"]


if __name__ == "__main__":
    import os

    import uvicorn

    # reload=True is intentional for local dev: per uvicorn's docs, on Windows
    # single-process mode uses the ProactorEventLoop (incompatible with
    # psycopg3 async), but with reload (or workers) it uses the SelectorEventLoop
    # — which, together with the policy set at import above, is what the DB
    # layer needs. Production runs on Linux (uvloop) where this is moot.
    uvicorn.run(
        "app.asgi:app",
        host="0.0.0.0",
        port=int(os.environ.get("BBB_PORT", "8000")),
        reload=True,
        ws_ping_interval=20,
        ws_ping_timeout=20,
    )
