#!/usr/bin/env bash
# FitMe AI — Hetzner VPS deploy script (pull → build → up → health check)
#
# Run this FROM the repo root on the VPS (e.g. /opt/fitme), as the `deploy`
# user set up in docs/DEPLOY_HETZNER_VPS.md section 2. Requires:
#   - .env.hetzner already populated (cp deploy/hetzner/.env.hetzner.example .env.hetzner)
#   - Docker + Docker Compose plugin installed (docs section 2.3)
#
# Usage:
#   ./deploy/hetzner/scripts/deploy-hetzner.sh                # backend only
#   ./deploy/hetzner/scripts/deploy-hetzner.sh --with-ai-vton # backend + self-hosted ai-vton
#   ./deploy/hetzner/scripts/deploy-hetzner.sh --no-pull       # skip `git pull` (deploy current checkout)
#
# Docs: docs/DEPLOY_HETZNER_VPS.md sections 3, 6, 9

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE="docker-compose.hetzner.yml"
ENV_FILE=".env.hetzner"
HEALTH_URL="http://127.0.0.1:8080/actuator/health"
MAX_WAIT_SECONDS=180

PROFILE_ARGS=()
DO_PULL=1

for arg in "$@"; do
  case "$arg" in
    --with-ai-vton)
      PROFILE_ARGS=(--profile ai)
      ;;
    --no-pull)
      DO_PULL=0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--with-ai-vton] [--no-pull]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: $COMPOSE_FILE not found in $REPO_ROOT. Run this from the repo root." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found in $REPO_ROOT." >&2
  echo "Copy deploy/hetzner/.env.hetzner.example to $ENV_FILE and fill in real values first." >&2
  exit 1
fi

if [[ "$DO_PULL" -eq 1 ]]; then
  echo "==> git pull origin main"
  git pull origin main
else
  echo "==> Skipping git pull (--no-pull)"
fi

if [[ ${#PROFILE_ARGS[@]} -gt 0 ]]; then
  echo "==> ai-vton profile enabled (self-hosting try-on on this VPS)"
fi

echo "==> docker compose -f $COMPOSE_FILE ${PROFILE_ARGS[*]:-} up -d --build"
docker compose -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" up -d --build

echo "==> Waiting for backend health check ($HEALTH_URL)..."
elapsed=0
until curl -sf "$HEALTH_URL" 2>/dev/null | grep -q '"status":"UP"'; do
  if (( elapsed >= MAX_WAIT_SECONDS )); then
    echo "ERROR: backend did not become healthy within ${MAX_WAIT_SECONDS}s." >&2
    echo "---- recent backend logs ----" >&2
    docker compose -f "$COMPOSE_FILE" logs --tail=150 backend >&2
    exit 1
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done

echo "==> Backend is UP:"
curl -s "$HEALTH_URL"
echo

if [[ ${#PROFILE_ARGS[@]} -gt 0 ]]; then
  echo "==> ai-vton logs (last 20 lines, check for startup errors):"
  docker compose -f "$COMPOSE_FILE" logs --tail=20 ai-vton || true
fi

echo "==> docker compose ps"
docker compose -f "$COMPOSE_FILE" "${PROFILE_ARGS[@]}" ps

echo "==> Deploy complete."
echo "==> Next: verify from outside via Caddy — curl -s https://api.yourdomain.com/actuator/health"
