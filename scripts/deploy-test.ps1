# FitMe AI — Deploy test stack (Docker Compose)
# Run from repo root: .\scripts\deploy-test.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$EnvFile = ".env.test"
$ExampleFile = ".env.test.example"

if (-not (Test-Path $EnvFile)) {
    Copy-Item $ExampleFile $EnvFile
    Write-Host "Created $EnvFile from template — review secrets before production test server." -ForegroundColor Yellow
}

Write-Host "Building and starting FitMe test stack..." -ForegroundColor Cyan
docker compose --env-file $EnvFile -f docker-compose.test.yml up -d --build

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$appPort = (Get-Content $EnvFile | Where-Object { $_ -match '^APP_PORT=' }) -replace 'APP_PORT=', ''
if (-not $appPort) { $appPort = "3000" }

Write-Host ""
Write-Host "Deploy complete." -ForegroundColor Green
Write-Host "  App:    http://localhost:$appPort"
Write-Host "  API:    http://localhost:$appPort/api/v1  (proxied via frontend)"
Write-Host "  Logs:   docker compose --env-file $EnvFile -f docker-compose.test.yml logs -f"
Write-Host "  Stop:   docker compose --env-file $EnvFile -f docker-compose.test.yml down"
Write-Host ""
Write-Host "Demo accounts (if seed enabled): admin@fitme.ai / brand@fitme.ai / user@fitme.ai — password from FITME_SEED_PASSWORD"
