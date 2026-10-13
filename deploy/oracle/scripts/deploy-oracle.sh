#!/usr/bin/env bash
# FitMe AI — Oracle Cloud deploy (pull → build → up → health check)
#
# Run from anywhere on the VM; requires .env.oracle in the repo root.
# Usage:
#   ./deploy/oracle/scripts/deploy-oracle.sh            # git pull + rebuild + restart
#   ./deploy/oracle/scripts/deploy-oracle.sh --no-pull  # deploy the current checkout
#
# Docs: docs/DEPLOY_ORACLE_CLOUD.md

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE=".env.oracle"
COMPOSE=(docker compose -f docker-compose.oracle.yml --env-file "$ENV_FILE")
HEALTH_URL="http://127.0.0.1:8080/actuator/health"
MAX_WAIT_SECONDS=300

DO_PULL=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    *)
      echo "Usage: $0 [--no-pull]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found in $REPO_ROOT." >&2
  echo "Copy deploy/oracle/.env.oracle.example to $ENV_FILE and fill in real values first." >&2
  exit 1
fi

env_value() {
  grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//"
}

missing=()
for key in FITME_API_DOMAIN DB_URL DB_USERNAME DB_PASSWORD JWT_SECRET FITME_PUBLIC_BASE_URL; do
  [[ -n "$(env_value "$key")" ]] || missing+=("$key")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "ERROR: empty in $ENV_FILE: ${missing[*]}" >&2
  exit 1
fi
if [[ "$(env_value AI_VTON_INTERNAL_TOKEN)" != "$(env_value VTON_INTERNAL_TOKEN)" ]]; then
  echo "ERROR: AI_VTON_INTERNAL_TOKEN and VTON_INTERNAL_TOKEN must be identical." >&2
  exit 1
fi

if [[ "$DO_PULL" -eq 1 ]]; then
  echo "==> git pull origin main"
  git pull origin main
fi

echo "==> Building and starting containers (first ARM build takes ~5-10 min)"
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "==> Waiting for backend health ($HEALTH_URL)..."
elapsed=0
until curl -sf "$HEALTH_URL" 2>/dev/null | grep -q '"status":"UP"'; do
  if (( elapsed >= MAX_WAIT_SECONDS )); then
    echo "ERROR: backend not healthy after ${MAX_WAIT_SECONDS}s. Recent logs:" >&2
    "${COMPOSE[@]}" logs --tail=150 backend >&2
    exit 1
  fi
  sleep 5
  elapsed=$((elapsed + 5))
done
echo "==> Backend UP: $(curl -s "$HEALTH_URL")"

echo "==> ai-vton: $(curl -s http://127.0.0.1:8001/health || echo 'not responding')"

docker image prune -f >/dev/null

"${COMPOSE[@]}" ps

DOMAIN="$(env_value FITME_API_DOMAIN)"
echo "==> Public check: https://$DOMAIN/actuator/health"
if curl -sf --max-time 20 "https://$DOMAIN/actuator/health"; then
  echo
  echo "==> Deploy complete."
else
  echo
  echo "WARN: public HTTPS not reachable yet. Check DNS → VM IP, OCI Security List 80/443," >&2
  echo "      and Caddy logs: docker logs fitme-caddy --tail=50" >&2
fi
