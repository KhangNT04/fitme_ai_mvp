#!/usr/bin/env bash
# Point .env.oracle at the local Docker Postgres and enable one-shot seed.
# Usage on VM: POSTGRES_PASSWORD=... SEED_PASSWORD=... ./deploy/oracle/scripts/switch-to-local-postgres.sh
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"
ENV_FILE=".env.oracle"

: "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}"
: "${SEED_PASSWORD:?set SEED_PASSWORD}"

cp -a "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"

python3 - <<'PY'
import os, re
from pathlib import Path
path = Path(".env.oracle")
text = path.read_text(encoding="utf-8")
pw = os.environ["POSTGRES_PASSWORD"]
seed_pw = os.environ["SEED_PASSWORD"]

def set_kv(text, key, value, quote=True):
    q = f'"{value}"' if quote else value
    pat = re.compile(rf'^{re.escape(key)}=.*$', re.M)
    line = f"{key}={q}"
    if pat.search(text):
        return pat.sub(line, text)
    return text.rstrip() + "\n" + line + "\n"

text = set_kv(text, "POSTGRES_DB", "fitme")
text = set_kv(text, "POSTGRES_USER", "fitme")
text = set_kv(text, "POSTGRES_PASSWORD", pw)
text = set_kv(text, "DB_URL", "jdbc:postgresql://postgres:5432/fitme")
text = set_kv(text, "DB_USERNAME", "fitme")
text = set_kv(text, "DB_PASSWORD", pw)
text = set_kv(text, "FITME_SEED_ENABLED", "true", quote=False)
text = set_kv(text, "FITME_SEED_PASSWORD", seed_pw)
text = set_kv(text, "FITME_SEED_FASHION_REFRESH", "true", quote=False)
# Local Postgres: keep a small idle pool; Neon scale-to-zero knobs not needed.
text = set_kv(text, "SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE", "1", quote=False)
path.write_text(text, encoding="utf-8")
print("updated", path)
PY

echo "Backup kept next to .env.oracle. Next: docker compose up -d --build"
