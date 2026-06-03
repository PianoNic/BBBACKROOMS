# syntax=docker/dockerfile:1.7
FROM python:3.13-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN groupadd -r app && useradd -r -g app -u 1000 app \
    && mkdir /app && chown app:app /app

WORKDIR /app

COPY --chown=app:app requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app app ./app

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
