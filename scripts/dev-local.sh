#!/usr/bin/env bash
# FitMe AI — Local pre-deploy stack
# Usage: ./scripts/dev-local.sh | ./scripts/dev-local.sh down | logs | native

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env.local"
EXAMPLE=".env.local.example"
COMPOSE="docker-compose.local.yml"

ensure_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$EXAMPLE" "$ENV_FILE"
    echo "Created $ENV_FILE — edit GEMINI_API_KEY before testing Gemini stylist."
  fi
}

read_env() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true
}

ensure_env

case "${1:-up}" in
  down)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE" down
    ;;
  logs)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE" logs -f
    ;;
  native)
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE" up -d postgres
    PG_PORT="$(read_env POSTGRES_PORT)"
    PG_PORT="${PG_PORT:-5433}"
    cat <<EOF

Postgres: localhost:${PG_PORT}

Terminal 2 — Backend:
  cd backend && set -a && source ../.env.local && set +a
  export DB_URL=jdbc:postgresql://localhost:${PG_PORT}/fitme
  mvn spring-boot:run

Terminal 3 — Frontend:
  cd frontend && BACKEND_INTERNAL_URL=http://localhost:8080 npm run dev

Terminal 4 — ai-vton (optional):
  cd ai-services/vton && pip install -e ".[dev]"
  AI_MODE=mock uvicorn app.main:app --reload --port 8001

App: http://localhost:3000
EOF
    ;;
  *)
    if [[ "$(read_env FITME_AI_STYLIST_MODE)" == "gemini" && -z "$(read_env GEMINI_API_KEY)" ]]; then
      echo "Warning: GEMINI_API_KEY empty — stylist will fallback to rules."
    fi
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE" up -d --build
    APP_PORT="$(read_env APP_PORT)"; APP_PORT="${APP_PORT:-3000}"
    API_PORT="$(read_env API_PORT)"; API_PORT="${API_PORT:-8080}"
    echo ""
    echo "Local stack: http://localhost:${APP_PORT}"
    echo "Backend:     http://localhost:${API_PORT}/actuator/health"
    echo "ai-vton:     http://localhost:8001/docs"
    echo "Stop: ./scripts/dev-local.sh down"
    ;;
esac
