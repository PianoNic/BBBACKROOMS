# syntax=docker/dockerfile:1.7
#
# One image for the whole game: the Vite client is built with Bun, then copied
# into the Python image and served by FastAPI itself (see app/main.py). The
# API and the SPA are the same origin by construction, so there is no nginx
# layer and no proxy config to keep in sync — and no way to deploy a client
# and a server that disagree about the wire protocol.

# ---------- stage 1: build the client ----------
# Pinned to the *build* platform: the output is static JS/CSS/assets, identical
# for every target arch, so building it once natively beats running Bun under
# QEMU emulation once per platform in the multi-arch release build.
FROM --platform=$BUILDPLATFORM oven/bun:1.3-alpine AS client
WORKDIR /client

# Lockfile first so dependency installs stay cached across source-only changes.
COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

COPY client/ ./
RUN bun run build

# ---------- stage 2: runtime ----------
FROM python:3.13-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN groupadd -r app && useradd -r -g app -u 1000 app \
    && mkdir /app && chown app:app /app

WORKDIR /app

COPY --chown=app:app server/requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app server/app ./app
COPY --from=client --chown=app:app /client/dist ./static

USER app

EXPOSE 8000

# Apply migrations (separate sync step; non-fatal if the DB is down) then serve
# via app.asgi. On Linux uvicorn uses uvloop, so the Selector-loop guard is a
# no-op here. `exec` hands PID 1 to uvicorn for clean signal handling.
CMD ["sh", "-c", \
     "python -m app.db.migrate run; \
      exec uvicorn app.asgi:app --host 0.0.0.0 --port 8000 \
      --proxy-headers --forwarded-allow-ips=* \
      --ws-ping-interval 20 --ws-ping-timeout 20"]
