# FitMe AI — Local pre-deploy stack (test AI trước Vercel/Render)
# Usage:
#   .\scripts\dev-local.ps1           # build + start
#   .\scripts\dev-local.ps1 -Down     # stop
#   .\scripts\dev-local.ps1 -Logs     # follow logs
#   .\scripts\dev-local.ps1 -Native    # chỉ Postgres + hướng dẫn hot-reload

param(
    [switch]$Down,
    [switch]$Logs,
    [switch]$Native
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$EnvFile = ".env.local"
$ExampleFile = ".env.local.example"
$ComposeFile = "docker-compose.local.yml"

function Ensure-EnvFile {
    if (-not (Test-Path $EnvFile)) {
        if (-not (Test-Path $ExampleFile)) {
            Write-Error "$ExampleFile not found"
            exit 1
        }
        Copy-Item $ExampleFile $EnvFile
        Write-Host "Created $EnvFile — edit GEMINI_API_KEY and optional HF_TOKEN before testing AI." -ForegroundColor Yellow
    }
}

function Read-EnvValue([string]$Key) {
    $line = Get-Content $EnvFile -ErrorAction SilentlyContinue | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
    if ($line) { return ($line -replace "^$Key=", "").Trim() }
    return $null
}

Ensure-EnvFile

if ($Native) {
    Write-Host "Starting Postgres only for native hot-reload dev..." -ForegroundColor Cyan
    docker compose --env-file $EnvFile -f $ComposeFile up -d postgres
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $pgPort = Read-EnvValue "POSTGRES_PORT"
    if (-not $pgPort) { $pgPort = "5433" }

    Write-Host ""
    Write-Host "Postgres: localhost:$pgPort" -ForegroundColor Green
    Write-Host ""
    Write-Host "Terminal 2 — Backend:" -ForegroundColor Cyan
    Write-Host "  cd backend"
    Write-Host "  `$env:SPRING_PROFILES_ACTIVE='dev'"
    Write-Host "  Get-Content ..\.env.local | ForEach-Object { if (`$_ -match '^([^#=]+)=(.*)$') { Set-Item -Path env:`$matches[1] -Value `$matches[2] } }"
    Write-Host "  `$env:DB_URL='jdbc:postgresql://localhost:$pgPort/fitme'"
    Write-Host "  mvn spring-boot:run"
    Write-Host ""
    Write-Host "Terminal 3 — Frontend:" -ForegroundColor Cyan
    Write-Host "  cd frontend"
    Write-Host "  `$env:BACKEND_INTERNAL_URL='http://localhost:8080'"
    Write-Host "  npm run dev"
    Write-Host ""
    Write-Host "Terminal 4 — ai-vton (optional):" -ForegroundColor Cyan
    Write-Host "  cd ai-services/vton"
    Write-Host "  pip install -e `".[dev]`""
    Write-Host "  `$env:AI_MODE='mock'   # or hf + HF_TOKEN"
    Write-Host "  uvicorn app.main:app --reload --port 8001"
    Write-Host ""
    Write-Host "App: http://localhost:3000  |  Docs: docs/LOCAL_AI_DEV.md"
    exit 0
}

if ($Down) {
    docker compose --env-file $EnvFile -f $ComposeFile down
    exit $LASTEXITCODE
}

if ($Logs) {
    docker compose --env-file $EnvFile -f $ComposeFile logs -f
    exit $LASTEXITCODE
}

$geminiKey = Read-EnvValue "GEMINI_API_KEY"
$stylistMode = Read-EnvValue "FITME_AI_STYLIST_MODE"
if ($stylistMode -eq "gemini" -and [string]::IsNullOrWhiteSpace($geminiKey)) {
    Write-Host "Warning: FITME_AI_STYLIST_MODE=gemini but GEMINI_API_KEY is empty — stylist will fallback to rules." -ForegroundColor Yellow
}

Write-Host "Building and starting FitMe LOCAL stack (postgres + backend + frontend + ai-vton)..." -ForegroundColor Cyan
docker compose --env-file $EnvFile -f $ComposeFile up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$appPort = Read-EnvValue "APP_PORT"
if (-not $appPort) { $appPort = "3000" }
$apiPort = Read-EnvValue "API_PORT"
if (-not $apiPort) { $apiPort = "8080" }

Write-Host ""
Write-Host "Local pre-deploy stack is up." -ForegroundColor Green
Write-Host "  App:      http://localhost:$appPort"
Write-Host "  API:      http://localhost:$appPort/api/v1"
Write-Host "  Backend:  http://localhost:$apiPort/actuator/health"
Write-Host "  ai-vton:  http://localhost:8001/docs"
Write-Host ""
Write-Host "Test AI stylist:  /ai/* flow on app"
Write-Host "Test VTON:        try-on USER_PHOTO (FITME_AI_MODE=mock|hf in .env.local)"
Write-Host ""
Write-Host "Logs:  .\scripts\dev-local.ps1 -Logs"
Write-Host "Stop:  .\scripts\dev-local.ps1 -Down"
Write-Host "Docs:  docs/LOCAL_AI_DEV.md"
Write-Host ""
Write-Host "Demo: admin@fitme.ai / brand@fitme.ai / user@fitme.ai — password from FITME_SEED_PASSWORD"
