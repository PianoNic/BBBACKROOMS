#!/usr/bin/env pwsh
# Load .env from the repo root so PORT / TURN_TOKEN_ID / CLOUDFLARE_API_TOKEN
# come from a single source of truth (same file docker-compose reads).
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*?)\s*$') {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }
} else {
  Write-Warning ".env not found at $envFile — TURN will fall back to STUN-only"
}

# Apply pending DB migrations as a separate sync step (peewee-migrate is
# synchronous and must not run inside the async event loop). Non-fatal: if the
# database is down the game still runs, just without accounts/persistence.
Write-Host "Applying database migrations..."
python -m app.db.migrate run
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Migrations failed (database down?) — starting without persistence."
}

# Launch via the ASGI entrypoint so the Windows Selector-loop fix is applied
# before uvicorn creates its loop (psycopg3 async needs it). Reload is enabled
# inside app/asgi.py's __main__.
python -m app.asgi
