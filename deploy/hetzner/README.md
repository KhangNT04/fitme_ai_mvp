# `deploy/hetzner/` — Hetzner VPS deploy assets

Supporting files for running the FitMe AI backend on a Hetzner VPS as the
**primary** production backend (Render becomes a cold backup). Full guide:
[`docs/DEPLOY_HETZNER_VPS.md`](../../docs/DEPLOY_HETZNER_VPS.md).

| File | Purpose |
|------|---------|
| [`.env.hetzner.example`](./.env.hetzner.example) | Template for the VPS env file. Copy to repo root as `.env.hetzner`, fill in real values (many copied verbatim from the Render dashboard), never commit. |
| [`Caddyfile.example`](./Caddyfile.example) | Reverse proxy config (TLS termination) to copy to `/etc/caddy/Caddyfile` on the VPS. |
| [`scripts/deploy-hetzner.sh`](./scripts/deploy-hetzner.sh) | Pull latest code → `docker compose up -d --build` → wait for `/actuator/health` → print status. Run from the repo root on the VPS. |

The actual compose file lives at the repo root: [`docker-compose.hetzner.yml`](../../docker-compose.hetzner.yml)
(kept at root, alongside `docker-compose.yml`/`docker-compose.test.yml`, so
`docker compose -f docker-compose.hetzner.yml ...` works from repo root without
extra `-f` path juggling).

See also: [`docs/HETZNER_CUTOVER_CHECKLIST.md`](../../docs/HETZNER_CUTOVER_CHECKLIST.md)
for the step-by-step "agent prepared vs you must do" cutover checklist.
