#!/usr/bin/env bash
# FitMe CI E2E helper — Linux/macOS (mirrors GitHub Actions e2e job)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
BACKEND="$ROOT/backend"

export DB_URL="${DB_URL:-jdbc:postgresql://localhost:5432/fitme}"
export DB_USERNAME="${DB_USERNAME:-fitme}"
export DB_PASSWORD="${DB_PASSWORD:-fitme123}"
export JWT_SECRET="${JWT_SECRET:-ci-jwt-secret-min-256-bits-long-for-testing-only}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000}"
export FITME_SEED_ENABLED="${FITME_SEED_ENABLED:-true}"
export PLAYWRIGHT_START_SERVER=1

echo ">> Starting backend..."
(cd "$BACKEND" && mvn spring-boot:run -q) &
BE_PID=$!

cleanup() {
  kill "$BE_PID" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 60); do
  if curl -sf http://localhost:8080/api/v1/products >/dev/null 2>&1; then
    echo "Backend ready"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Backend failed to start"
    exit 1
  fi
  sleep 5
done

echo ">> Running Playwright E2E..."
cd "$FRONTEND"
npx playwright test e2e/smoke-routes.spec.ts e2e/role-flows.spec.ts --workers=1
