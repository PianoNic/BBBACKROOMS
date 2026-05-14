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

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
