# Hetzner Cutover Checklist — Agent-prepared vs You-must-do

Quick-reference companion to [`DEPLOY_HETZNER_VPS.md`](./DEPLOY_HETZNER_VPS.md).
Follow the **Step** column in order. ✅ = already done in this repo (nothing to
build). 👤 = requires a human with access to Hetzner console / DNS provider /
Render dashboard / Vercel dashboard — the agent cannot do these (no
credentials, no SSH access, no browser sessions on your accounts).

| # | Step | ✅ Agent prepared | 👤 You must do |
|---|------|-------------------|-----------------|
| 1 | Create the VPS | `docker-compose.hetzner.yml` (root), `deploy/hetzner/Caddyfile.example`, `deploy/hetzner/.env.hetzner.example` ready to use once the server exists | Create Hetzner Cloud account + server (CX22, Ubuntu 24.04, Singapore/Falkenstein, upload your SSH key). Note the public IP. See [`DEPLOY_HETZNER_VPS.md` §1](./DEPLOY_HETZNER_VPS.md#1-chọn-gói-hetzner) |
| 2 | First SSH login + bootstrap | Exact commands documented in [§2](./DEPLOY_HETZNER_VPS.md#2-bootstrap-server-docker--ufw--reverse-proxy) (create `deploy` user, install Docker, `ufw`, Caddy) | SSH in as `root`, run the bootstrap commands from §2 yourself (or paste the IP back here and the agent can SSH once you grant access — see "What to paste back" below) |
| 3 | Clone the repo onto the VPS | Repo is public/pushable as-is; no repo changes needed | `git clone <repo-url> /opt/fitme` on the VPS |
| 4 | Create the VPS env file | Full template with every key + comments: `deploy/hetzner/.env.hetzner.example` | On the VPS: `cp deploy/hetzner/.env.hetzner.example .env.hetzner`, then open the **Render dashboard → your service → Environment** tab and copy each `[Render]`-marked value across (DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, CORS_ORIGINS, R2_*, GEMINI_API_KEY, PAYOS_*). Set the `[VPS-only]` values yourself (`FITME_PUBLIC_BASE_URL=https://api.yourdomain.com`, etc.) |
| 5 | DNS: point your domain at the VPS | Exact record documented in [§5](./DEPLOY_HETZNER_VPS.md#5-domain-apiyourdomaincom--vps) | In your DNS provider (Cloudflare/Namecheap/etc.), create an **A record**: `api` → your VPS IP (proxy OFF until SSL issued) |
| 6 | Reverse proxy + TLS | `deploy/hetzner/Caddyfile.example` ready to copy | On the VPS: install Caddy (§2.5), copy `deploy/hetzner/Caddyfile.example` → `/etc/caddy/Caddyfile`, replace `api.yourdomain.com` with your real domain, `systemctl restart caddy` |
| 7 | Build & start the backend | `docker-compose.hetzner.yml` + `deploy/hetzner/scripts/deploy-hetzner.sh` (pull/build/up + health-check loop, exits non-zero with logs if unhealthy) | On the VPS: `./deploy/hetzner/scripts/deploy-hetzner.sh` (add `--with-ai-vton` only if self-hosting try-on — see [§7](./DEPLOY_HETZNER_VPS.md#7-fashn-try-on-trên-hetzner-ai-vton)) |
| 8 | Smoke test directly against the VPS | Exact `curl` commands documented in [§6.3](./DEPLOY_HETZNER_VPS.md#63-trỏ-domain--ssl) | Run: `curl -s https://api.yourdomain.com/actuator/health` and `curl -s https://api.yourdomain.com/api/v1/products`; try logging in with a real (non-seed) account |
| 9 | Cut traffic over on Vercel | `frontend/next.config.ts` already reads `BACKEND_INTERNAL_URL` at build time — no code change needed | Vercel dashboard → Project → Settings → Environment Variables → set `BACKEND_INTERNAL_URL=https://api.yourdomain.com` → **Redeploy** |
| 10 | Verify end-to-end on the real domain | — | Open your Vercel app URL, test login, browse products, try-on, brand/admin portal |
| 11 | Burn-in monitoring | `/actuator/health` endpoint already exists; §9.2 documents optional UptimeRobot setup | Watch `docker compose -f docker-compose.hetzner.yml logs -f backend` for 30–60 min; optionally add UptimeRobot pinging `/actuator/health` |
| 12 | Keep Render as cold backup | Backup/fallback procedure fully documented in [§8](./DEPLOY_HETZNER_VPS.md#8-giữ-render-làm-backup-lạnh) (checklist + rollback steps) | Do **nothing** — leave the Render service as-is (free tier, let it sleep). Just remember: to fail back, wake it up first, then flip `BACKEND_INTERNAL_URL` on Vercel back to the Render URL |

---

## What to paste back if you want the agent to continue via SSH

If you'd like the agent to run steps 2–8 for you over SSH instead of doing them
by hand, paste back:

1. **VPS public IP** (e.g. `203.0.113.10`)
2. **SSH access** — either grant the agent an SSH session/terminal to the box,
   or confirm you've completed §2 (bootstrap: `deploy` user + Docker + ufw +
   Caddy installed) and just want the repo cloned + deployed
3. **Your real domain** you want to use (e.g. `api.yourdomain.com`) — confirm
   the DNS A record is already created and has propagated (`nslookup
   api.yourdomain.com`)
4. **Render env values** — either paste them directly (careful: this chat may
   be logged) or confirm you've already filled `.env.hetzner` on the VPS
   yourself following step 4 above
5. Whether you want `ai-vton` self-hosted on the VPS (`--with-ai-vton`) or kept
   on Render (default, simplest)

**Never paste real secrets (JWT_SECRET, DB_PASSWORD, GEMINI_API_KEY,
R2_SECRET_ACCESS_KEY, FASHN_API_KEY, PAYOS keys) into a chat you don't fully
trust.** If in doubt, fill `.env.hetzner` yourself on the VPS (step 4) and just
tell the agent "env file is ready" — it can drive the rest (`git pull`,
`deploy-hetzner.sh`, health checks, Caddy config) without ever seeing the
secret values.

---

## Files this repo now has ready for you

- `docker-compose.hetzner.yml` — production compose (backend + optional `ai-vton` profile)
- `deploy/hetzner/.env.hetzner.example` — full env template with `[Render]`/`[VPS-only]` annotations
- `deploy/hetzner/Caddyfile.example` — reverse proxy + TLS config
- `deploy/hetzner/scripts/deploy-hetzner.sh` — pull → build → up → health-check script
- `deploy/hetzner/README.md` — orientation for the folder above
- `docs/DEPLOY_HETZNER_VPS.md` — full narrative guide (updated to reference the files above)
- `docs/HETZNER_CUTOVER_CHECKLIST.md` — this file
