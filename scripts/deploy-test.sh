#!/usr/bin/env bash
# FitMe AI — Deploy test stack (Docker Compose)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.test"
EXAMPLE=".env.test.example"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE" "$ENV_FILE"
  echo "Created $ENV_FILE — review secrets before shared test server."
fi

echo "Building and starting FitMe test stack..."
docker compose --env-file "$ENV_FILE" -f docker-compose.test.yml up -d --build

APP_PORT=$(grep -E '^APP_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "3000")

echo ""
echo "Deploy complete."
echo "  App:  http://localhost:${APP_PORT}"
echo "  API:  http://localhost:${APP_PORT}/api/v1"
echo "  Logs: docker compose --env-file $ENV_FILE -f docker-compose.test.yml logs -f"
