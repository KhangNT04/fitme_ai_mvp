#!/usr/bin/env bash
# Rebuild the coherent ~155-account demo world on the Oracle Postgres.
# Run from /opt/fitme on the VM.
#
#   DEMO_BCRYPT_HASH='$2b$10$...' ./deploy/oracle/scripts/apply-demo-world.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE=".env.oracle"
COMPOSE=(docker compose -f docker-compose.oracle.yml --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE missing" >&2
  exit 1
fi

if [[ -z "${DEMO_BCRYPT_HASH:-}" || "${DEMO_BCRYPT_HASH:0:3}" != '$2' ]]; then
  echo "ERROR: set DEMO_BCRYPT_HASH to a bcrypt hash" >&2
  exit 1
fi

echo "==> export active products"
"${COMPOSE[@]}" exec -T postgres psql -U fitme -d fitme -At -F'|' -c "
SELECT p.id,
       p.brand_id,
       replace(coalesce(p.name,''), '|', ' '),
       coalesce(p.purchase_url,''),
       replace(coalesce(p.category,''), '|', ' '),
       coalesce((
         SELECT i.image_url FROM product_images i
         WHERE i.product_id = p.id
         ORDER BY i.sort_order ASC
         LIMIT 1
       ), '')
FROM products p
WHERE p.status = 'ACTIVE'
ORDER BY p.created_at DESC;
" > /tmp/products.csv

lines=$(wc -l < /tmp/products.csv | tr -d ' ')
echo "    products=$lines"
if [[ "$lines" -lt 20 ]]; then
  echo "ERROR: not enough active products" >&2
  exit 1
fi

echo "==> generate SQL"
DEMO_BCRYPT_HASH="$DEMO_BCRYPT_HASH" python3 deploy/oracle/scripts/seed-demo-world.py /tmp/products.csv > /tmp/demo-world.sql
echo "    sql_bytes=$(wc -c < /tmp/demo-world.sql | tr -d ' ')"

echo "==> apply"
"${COMPOSE[@]}" exec -T postgres psql -U fitme -d fitme -v ON_ERROR_STOP=1 < /tmp/demo-world.sql | tail -40

echo "==> account breakdown"
"${COMPOSE[@]}" exec -T postgres psql -U fitme -d fitme -c "
SELECT role, COUNT(*) FROM user_accounts GROUP BY 1 ORDER BY 1;
SELECT COUNT(*) AS total_accounts FROM user_accounts;
"

echo "==> done"
