# Deploy FitMe AI — Hetzner VPS (Docker) — Backend production/demo **chính**

> **Đây là tài liệu deploy backend chính thức** cho môi trường production/demo. Backend Spring Boot chạy **luôn online** (không sleep) trên **Hetzner Cloud VPS + Docker**. Render chỉ còn vai trò **backup lạnh** (cold standby) khi VPS gặp sự cố — xem [mục 8](#8-giữ-render-làm-backup-lạnh). Frontend (Vercel) và database (Neon) **dùng chung, không đổi** giữa 2 phương án — xem [`DEPLOY_VERCEL_RENDER_NEON.md`](./DEPLOY_VERCEL_RENDER_NEON.md) (nay chỉ còn phần Vercel + Neon + Render-backup).
>
> **Muốn checklist ngắn gọn "cái gì đã có sẵn trong repo vs cái gì bạn tự làm"?** Xem [`HETZNER_CUTOVER_CHECKLIST.md`](./HETZNER_CUTOVER_CHECKLIST.md). File deploy cụ thể: [`docker-compose.hetzner.yml`](../docker-compose.hetzner.yml) (root) và [`deploy/hetzner/`](../deploy/hetzner/) (`.env.hetzner.example`, `Caddyfile.example`, `scripts/deploy-hetzner.sh`).

## Kiến trúc

```
Người dùng → Vercel (Next.js, FE) — không đổi dù backend nào đang active
                └─ /api/v1/*, /uploads/* → rewrite theo BACKEND_INTERNAL_URL
                                  │
                ┌─────────────────┴─────────────────────┐
                │                                        │
   CHÍNH — Hetzner VPS (Docker)              BACKUP LẠNH — Render (free/starter)
   https://api.yourdomain.com                https://fitme-ai-mvp.onrender.com
   Caddy (TLS) → backend:8080                sleep sau ~15' không request (free tier)
                │                                        │
                ├─ ai-vton (FASHN try-on)                ├─ ai-vton (Render, sleep)
                │  • cùng VPS (docker network), HOẶC     │  fitme-ai-vton.onrender.com
                │  • service Render riêng (giữ nguyên)   │
                │                                        │
                └───────────────────┬────────────────────┘
                                     ▼
                        Neon (PostgreSQL) — DÙNG CHUNG 1 DB
                        (chỉ MỘT backend được ghi tại 1 thời điểm)

                        Cloudflare R2 — DÙNG CHUNG 1 bucket
                        (ảnh user/wardrobe/try-on, độc lập backend nào đang chạy)
```

**3 nguyên tắc quan trọng:**

1. **Hetzner VPS là nguồn phục vụ traffic chính** — `BACKEND_INTERNAL_URL` trên Vercel trỏ về `https://api.yourdomain.com` trong điều kiện vận hành bình thường.
2. Tại một thời điểm, chỉ **MỘT** backend (VPS *hoặc* Render) được phục vụ traffic thật và ghi vào Neon. Không chạy song song cả hai trỏ cùng DB với traffic thật.
3. Render + Neon + R2 dùng **chung cấu hình** (cùng project Neon, cùng `JWT_SECRET`, cùng bucket R2) với VPS để có thể **failover trong vài phút** chỉ bằng cách đổi 1 biến env trên Vercel — xem [mục 8](#8-giữ-render-làm-backup-lạnh).

---

## Mục lục

1. [Chọn gói Hetzner](#1-chọn-gói-hetzner)
2. [Bootstrap server](#2-bootstrap-server-docker--ufw--reverse-proxy)
3. [Chạy backend FitMe từ repo](#3-chạy-backend-fitme-từ-repo)
4. [Checklist biến môi trường](#4-checklist-biến-môi-trường-envhetzner)
5. [Domain: api.yourdomain.com → VPS](#5-domain-apiyourdomaincom--vps)
6. [Cutover: chuyển từ Render sang Hetzner (production)](#6-cutover-chuyển-từ-render-sang-hetzner-production)
7. [FASHN try-on trên Hetzner (ai-vton)](#7-fashn-try-on-trên-hetzner-ai-vton)
8. [Giữ Render làm backup lạnh](#8-giữ-render-làm-backup-lạnh)
9. [Vận hành: deploy, health check, start/stop](#9-vận-hành-deploy-health-check-startstop)
10. [Chi phí: Hetzner vs Render free](#10-chi-phí-hetzner-vs-render-free)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Chọn gói Hetzner

| Gói | Cấu hình | Giá (~) | Ghi chú |
|-----|----------|---------|---------|
| **CX22** (khuyến nghị) | 2 vCPU, 4 GB RAM, 40 GB SSD | ~€3.79/tháng | Đủ chạy 1 container Spring Boot + Caddy; JVM mặc định ăn ~300–500 MB |
| CX32 | 4 vCPU, 8 GB RAM, 80 GB SSD | ~€6.80/tháng | Nếu chạy thêm `ai-vton` tự host cùng VPS (mục 7) hoặc test tải nặng |
| CX11/CPX11 (cũ) | 2 vCPU, 2 GB RAM | rẻ hơn | Có thể thiếu RAM khi build image Maven trên máy — build local rồi push, hoặc build trực tiếp trên VPS chậm hơn |

- **OS image:** Ubuntu 24.04 LTS (x64).
- **Location:** chọn gần người dùng demo — `Singapore` (nếu Hetzner có) hoặc `Falkenstein/Nuremberg (Đức)` nếu không; latency tới VN cao hơn Render Singapore một chút nhưng chấp nhận được vì đổi lại **không sleep**.
- **Networking:** bật IPv4 (cần cho domain A record). IPv6 tùy chọn.
- **SSH key:** upload public key của bạn khi tạo server (khuyến nghị hơn mật khẩu).

Sau khi tạo, ghi lại **IP public** (vd. `203.0.113.10`).

---

## 2. Bootstrap server (Docker + ufw + reverse proxy)

### 2.1. SSH vào server lần đầu

```bash
ssh root@203.0.113.10
```

### 2.2. Update hệ thống + tạo user thường (khuyến nghị)

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
# copy SSH key sang user mới rồi logout, ssh lại bằng deploy@...
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### 2.3. Cài Docker + Docker Compose plugin

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy   # chạy docker không cần sudo
newgrp docker
docker --version
docker compose version
```

### 2.4. Firewall (ufw) — chỉ mở 22/80/443

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

**Lưu ý:** KHÔNG mở port `8080` (backend) hay `8001` (ai-vton nếu tự host) ra ngoài — 2 service này chỉ nghe `127.0.0.1`, reverse proxy (Caddy) mới expose 80/443 ra internet.

### 2.5. Reverse proxy + Let's Encrypt — Caddy (khuyến nghị, đơn giản nhất)

Caddy tự xin & renew SSL, không cần certbot thủ công.

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Repo đã có sẵn template [`deploy/hetzner/Caddyfile.example`](../deploy/hetzner/Caddyfile.example) — copy sang `/etc/caddy/Caddyfile` và thay `api.yourdomain.com` bằng domain thật (xem [mục 5](#5-domain-apiyourdomaincom--vps) để trỏ DNS trước):

```bash
# Sau khi clone repo (mục 3.1), từ /opt/fitme:
cp deploy/hetzner/Caddyfile.example /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile   # thay api.yourdomain.com bằng domain thật
```

Nội dung template (tham khảo, không cần gõ tay):

```caddyfile
api.yourdomain.com {
    reverse_proxy 127.0.0.1:8080
}
```

```bash
systemctl restart caddy
systemctl enable caddy
```

Caddy sẽ tự lấy chứng chỉ Let's Encrypt cho `api.yourdomain.com` ngay khi DNS trỏ đúng và port 80/443 mở (ufw đã cho phép ở trên).

<details>
<summary>Thay thế: nginx + certbot (nếu muốn dùng nginx quen thuộc hơn)</summary>

```bash
apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/fitme-api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/fitme-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.yourdomain.com   # xin SSL + tự cấu hình redirect HTTPS
```

</details>

---

## 3. Chạy backend FitMe từ repo

Repo đã có `backend/Dockerfile` (multi-stage Maven build → JRE Alpine image, expose `8080`). VPS **không cần** container Postgres — dùng thẳng Neon (giống Render).

### 3.1. Clone repo

```bash
sudo mkdir -p /opt/fitme && sudo chown deploy:deploy /opt/fitme
cd /opt/fitme
git clone https://github.com/KhangNT04/fitme_ai_mvp.git .
```

### 3.2. Tạo file env riêng cho VPS (không commit)

Repo đã có sẵn template đầy đủ tại [`deploy/hetzner/.env.hetzner.example`](../deploy/hetzner/.env.hetzner.example) (mọi biến, có chú thích biến nào copy từ Render, biến nào riêng cho VPS):

```bash
cd /opt/fitme
cp deploy/hetzner/.env.hetzner.example .env.hetzner   # điền giá trị thật
nano .env.hetzner
```

Điền đầy đủ theo [checklist mục 4](#4-checklist-biến-môi-trường-envhetzner). **Không đưa file này vào git** — `.gitignore` đã chặn riêng `.env.hetzner` (và `.env*` khác ở root).

### 3.3. File compose cho VPS

Root `docker-compose.yml` trong repo dùng cho **dev local** (có Postgres container). Repo đã có sẵn file compose **riêng cho VPS** tại root: [`docker-compose.hetzner.yml`](../docker-compose.hetzner.yml) — không cần tự tạo, chỉ cần dùng:

```bash
docker compose -f docker-compose.hetzner.yml config   # xem trước cấu hình đã resolve (tuỳ chọn)
```

File này chỉ chạy `backend` mặc định (bind `127.0.0.1:8080`, đọc `.env.hetzner`, volume `backend_uploads` cho upload tạm — ảnh thật nên lưu R2, xem mục 4). Muốn tự host `ai-vton` trên cùng VPS thay vì giữ trên Render? Cùng file này đã có sẵn service `ai-vton` sau `--profile ai` — xem [mục 7.2](#72-tự-host-ai-vton-trên-cùng-vps-khuyến-nghị-cho-production-ổn-định).

> Nếu `FITME_STORAGE_MODE=r2` (khuyến nghị — xem mục 4), volume `backend_uploads` chỉ dùng cho upload tạm/log; ảnh thật lưu trên R2 nên **không phụ thuộc** disk VPS. Điều này cũng giúp ảnh hiển thị đúng dù sau này chuyển đổi qua lại giữa VPS ⇄ Render.

### 3.4. Build & chạy

Dùng script có sẵn [`deploy/hetzner/scripts/deploy-hetzner.sh`](../deploy/hetzner/scripts/deploy-hetzner.sh) (pull code mới nhất → build → up → chờ health check UP, in log nếu lỗi):

```bash
chmod +x deploy/hetzner/scripts/deploy-hetzner.sh   # chỉ cần 1 lần
./deploy/hetzner/scripts/deploy-hetzner.sh
# hoặc, nếu tự host ai-vton trên cùng VPS (mục 7.2):
./deploy/hetzner/scripts/deploy-hetzner.sh --with-ai-vton
```

Tương đương thủ công (nếu muốn tự chạy từng bước):

```bash
docker compose -f docker-compose.hetzner.yml up -d --build
docker compose -f docker-compose.hetzner.yml logs -f backend   # theo dõi log khởi động, Ctrl+C để thoát
```

### 3.5. Kiểm tra

```bash
curl -s http://127.0.0.1:8080/actuator/health
# {"status":"UP", ...}

curl -s https://api.yourdomain.com/actuator/health
curl -s https://api.yourdomain.com/api/v1/products
```

**Gợi ý RAM (CX22 4 GB):** nếu JVM ăn quá nhiều RAM, giới hạn heap qua biến môi trường trong `.env.hetzner` (JVM tự đọc `JAVA_TOOL_OPTIONS`, không cần sửa Dockerfile):

```
JAVA_TOOL_OPTIONS=-Xmx1536m
```

---

## 4. Checklist biến môi trường (`.env.hetzner`)

Giống hệt bộ biến dùng cho Render (để có thể **failover qua lại** dễ dàng — xem mục 8), chỉ khác `FITME_PUBLIC_BASE_URL` và không có giới hạn free tier.

| Biến | Giá trị VPS | Ghi chú |
|------|-------------|---------|
| `SPRING_PROFILES_ACTIVE` | `prod` | Tắt Swagger, seed mặc định off |
| `DB_URL` | `jdbc:postgresql://ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` | **Cùng Neon project** với Render (backup) |
| `DB_USERNAME` | user Neon | |
| `DB_PASSWORD` | password Neon | |
| `JWT_SECRET` | chuỗi random ≥32 ký tự | **Phải trùng** với Render + Vercel để không phải re-login khi failover |
| `CORS_ORIGINS` | `https://fitme-ai-mvp.vercel.app` | Đúng domain Vercel, không slash cuối |
| `FITME_SEED_ENABLED` | `false` | Bật `true` chỉ khi cần seed DB trống lần đầu |
| `FITME_SEED_FASHION_REFRESH` | `true` | Đồng bộ catalog thời trang khi khởi động |
| `FITME_SEED_PASSWORD` | mật khẩu mạnh | Chỉ cần khi bật seed |
| `UPLOAD_DIR` | `/app/uploads` | Volume Docker — persistent trên VPS (khác Render `/tmp`) |
| `FITME_PUBLIC_BASE_URL` | `https://api.yourdomain.com` | URL public backend — **khác Render**, dùng cho link ảnh/VTON |
| `FITME_FRONTEND_BASE_URL` | `https://fitme-ai-mvp.vercel.app` | Cho ảnh catalog phục vụ từ Vercel |
| `FITME_STORAGE_MODE` | `r2` | **Bắt buộc** dùng chung cho cả VPS lẫn Render — ảnh không "kẹt" theo 1 backend khi failover |
| `R2_ENDPOINT` / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_PUBLIC_BASE_URL` | Cloudflare R2 | **Cùng bucket** với Render — bắt buộc để failover không mất ảnh |
| `FITME_AI_STYLIST_MODE` | `gemini` | `rule` nếu tắt Gemini |
| `GEMINI_API_KEY` | key từ [Google AI Studio](https://aistudio.google.com/apikey) | |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `GEMINI_TIMEOUT_MS` | `15000` | VPS always-on, không cold-start — có thể để thấp hơn Render (`25000`) |
| `FITME_AI_MODE` | `api` (khuyến nghị, FASHN) hoặc `hf` | Gọi service `ai-vton`. `api` = FASHN hosted API (`FASHN_API_KEY` đặt **trên `ai-vton`**, KHÔNG đặt ở backend). Xem [mục 7](#7-fashn-try-on-trên-hetzner-ai-vton) |
| `AI_VTON_URL` | `http://ai-vton:8001` (tự host cùng VPS) hoặc `https://fitme-ai-vton.onrender.com` (giữ trên Render) | Xem [mục 7.1](#71-lựa-chọn-1--giữ-ai-vton-trên-render-đơn-giản-nhất) |
| `PAYOS_MOCK` | `true`/`false` | Giống cấu hình Render đang dùng |
| `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL` | trỏ về Vercel | |
| `PAYOS_CLIENT_ID` / `PAYOS_API_KEY` / `PAYOS_CHECKSUM_KEY` | chỉ khi `PAYOS_MOCK=false` | |

Template đầy đủ có sẵn: [`deploy/hetzner/.env.hetzner.example`](../deploy/hetzner/.env.hetzner.example) (mọi biến trong bảng trên, kèm chú thích `[Render]`/`[VPS-only]`). Template chung cho các platform cloud khác: [`.env.cloud.example`](../.env.cloud.example).

---

## 5. Domain: `api.yourdomain.com` → VPS

1. Vào DNS provider của domain bạn (Cloudflare, Namecheap, v.v.).
2. Tạo bản ghi **A**:

   | Type | Name | Value | Proxy |
   |------|------|-------|-------|
   | A | `api` | `203.0.113.10` (IP VPS) | **DNS only** (tắt proxy Cloudflare orange-cloud khi mới cấp SSL, để Caddy xác thực HTTP-01 trực tiếp) |

3. Đợi DNS propagate (thường 1–10 phút, `nslookup api.yourdomain.com` để kiểm tra).
4. Chạy Caddy ở [mục 2.5](#25-reverse-proxy--lets-encrypt--caddy-khuyến-nghị-đơn-giản-nhất) — chỉ hoạt động **sau khi** DNS đã trỏ đúng.
5. (Tùy chọn) Sau khi có SSL, có thể bật lại Cloudflare proxy (orange-cloud) để có thêm DDoS protection/cache — không bắt buộc cho demo.

Domain frontend (`fitme-ai-mvp.vercel.app` hoặc domain riêng của bạn trên Vercel) **giữ nguyên**, không đổi.

---

## 6. Cutover: chuyển từ Render sang Hetzner (production)

Áp dụng khi bạn **đang có backend chạy trên Render** (theo [`DEPLOY_VERCEL_RENDER_NEON.md`](./DEPLOY_VERCEL_RENDER_NEON.md)) và muốn chuyển traffic thật sang Hetzner VPS làm backend chính, không downtime, có đường lùi.

### 6.1. Chuẩn bị (không ảnh hưởng traffic hiện tại)

- [ ] Hoàn thành [mục 1–2](#1-chọn-gói-hetzner) — server đã có Docker, ufw, Caddy.
- [ ] Copy **toàn bộ** biến env đang set trên Render dashboard sang `.env.hetzner` (mục 3.2), chỉ đổi `FITME_PUBLIC_BASE_URL` thành `https://api.yourdomain.com` — xem [checklist mục 4](#4-checklist-biến-môi-trường-envhetzner). Điều này đảm bảo VPS trỏ **đúng cùng Neon DB, cùng JWT_SECRET, cùng bucket R2** với Render.
- [ ] **Tắt seed trên VPS** trước khi test: `FITME_SEED_ENABLED=false` — DB đã có dữ liệu thật từ Render, seed lại có thể trùng/ghi đè không mong muốn.

### 6.2. Deploy VPS song song (chưa nhận traffic thật)

```bash
docker compose -f docker-compose.hetzner.yml up -d --build
curl -s http://127.0.0.1:8080/actuator/health
```

Ở bước này, VPS **đã kết nối cùng Neon DB** với Render nhưng **chưa có traffic user** (chưa domain, chưa Vercel trỏ tới) — an toàn vì Spring Boot chỉ đọc/ghi khi có request thật, không có tiến trình nền nào tự ghi DB định kỳ (trừ `FITME_SEED_FASHION_REFRESH` chạy 1 lần lúc khởi động — không xung đột với Render).

### 6.3. Trỏ domain + SSL

- Thực hiện [mục 5](#5-domain-apiyourdomaincom--vps) (DNS A record → IP VPS) và [mục 2.5](#25-reverse-proxy--lets-encrypt--caddy-khuyến-nghị-đơn-giản-nhất) (Caddy cấp SSL).
- Smoke test **trực tiếp** vào VPS (chưa qua Vercel):

```bash
curl -s https://api.yourdomain.com/actuator/health
curl -s https://api.yourdomain.com/api/v1/products
# Thử login bằng tài khoản thật đã tồn tại trên Neon (không phải tài khoản seed)
curl -s -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}'
```

### 6.4. Chuyển traffic thật (Vercel)

1. Vercel dashboard → Project → **Settings → Environment Variables** → sửa `BACKEND_INTERNAL_URL` từ `https://fitme-ai-mvp.onrender.com` → `https://api.yourdomain.com`.
2. **Redeploy** (Next.js dùng biến này ở build-time cho rewrite `/api/v1/*`, `/uploads/*` — xem `frontend/next.config.ts`).
3. Mở lại app trên domain Vercel thật → kiểm tra login, đổi outfit, try-on, admin/brand portal.

### 6.5. Burn-in & giám sát sau cutover

- [ ] Theo dõi log VPS 30–60 phút đầu: `docker compose -f docker-compose.hetzner.yml logs -f backend`.
- [ ] Kiểm tra `/actuator/health` định kỳ (hoặc UptimeRobot — [mục 9.2](#92-health-check)).
- [ ] Xác nhận không còn traffic thật vào Render (xem log/metrics Render dashboard giảm về 0 request ngoài health check của bạn).

### 6.6. Đường lùi (rollback) nếu VPS gặp sự cố ngay sau cutover

Vì Render vẫn còn nguyên cấu hình và cùng DB, rollback chỉ là đảo ngược bước 6.4:

1. Đổi `BACKEND_INTERNAL_URL` trên Vercel về lại `https://fitme-ai-mvp.onrender.com` → Redeploy.
2. Nếu Render đang sleep (free tier), đánh thức trước (mở `/actuator/health`, đợi `UP`) — xem checklist đầy đủ ở [mục 8.2](#82-checklist-trước-khi-fallback-sang-render).
3. Sau khi ổn định trên Render, quay lại debug VPS rồi thử cutover lại từ [mục 6.2](#62-deploy-vps-song-song-chưa-nhận-traffic-thật).

---

## 7. FASHN try-on trên Hetzner (ai-vton)

Service `ai-vton` (Python, `ai-services/vton/`) là microservice riêng gọi provider try-on (FASHN hosted API, HuggingFace, hoặc Replicate) — **độc lập** với backend Spring Boot. Có 2 lựa chọn khi backend chính chạy trên Hetzner:

### 7.1. Lựa chọn 1 — Giữ `ai-vton` trên Render (đơn giản nhất)

Không cần đổi gì ở `ai-vton` — backend trên VPS chỉ cần trỏ `AI_VTON_URL` tới URL Render hiện có:

```
AI_VTON_URL=https://fitme-ai-vton.onrender.com
FITME_AI_MODE=api        # hoặc hf, tuỳ provider đang cấu hình trên ai-vton
```

**Đánh đổi:** nếu `ai-vton` trên Render free tier bị sleep, request try-on đầu tiên sau khi backend VPS đã always-on vẫn có thể chờ 30–60s cold start (chỉ ảnh hưởng try-on, không ảnh hưởng phần còn lại của app vì backend chính không sleep). Nếu cần try-on cũng luôn nhanh, nâng `ai-vton` lên Render Starter hoặc dùng lựa chọn 2 dưới đây.

### 7.2. Lựa chọn 2 — Tự host `ai-vton` trên cùng VPS (khuyến nghị cho production ổn định)

`docker-compose.hetzner.yml` (mục 3.3) **đã có sẵn** service `ai-vton` — mặc định **tắt** (đứng sau `profiles: ["ai"]`), chỉ cần bật bằng cờ `--with-ai-vton` khi chạy script deploy hoặc `--profile ai` khi gọi `docker compose` trực tiếp:

```bash
./deploy/hetzner/scripts/deploy-hetzner.sh --with-ai-vton
# tương đương thủ công:
docker compose -f docker-compose.hetzner.yml --profile ai up -d --build
```

Không cần sửa file compose — chỉ cần set trong `.env.hetzner` (đã có sẵn phần chú thích tương ứng trong [`deploy/hetzner/.env.hetzner.example`](../deploy/hetzner/.env.hetzner.example)):

```
FITME_AI_MODE=api
AI_VTON_URL=http://ai-vton:8001   # gọi qua docker network nội bộ, không cần public
FASHN_API_KEY=fa-xxx              # chỉ ai-vton đọc biến này, backend không cần
FASHN_MODEL_NAME=tryon-v1.6
```

**Biến env cho `ai-vton`** (đặt trong `.env.hetzner`, KHÔNG commit):

| Biến | Giá trị | Ghi chú |
|------|---------|---------|
| `AI_MODE` | `api` | FASHN hosted API — khuyến nghị production (chất lượng ổn định nhất) |
| `FASHN_API_KEY` | key từ [app.fashn.ai/api](https://app.fashn.ai/api) | **Chỉ đặt ở đây** (service `ai-vton`) — backend Spring Boot **không bao giờ** cần biến này |
| `FASHN_MODEL_NAME` | `tryon-v1.6` (hoặc `tryon-max` cho độ chính xác cao hơn, hỗ trợ giày/mũ/túi) | Tuỳ nhu cầu |
| `VTON_PUBLIC_BASE_URL` | `http://ai-vton:8001` (nội bộ) — chỉ cần public nếu gọi trực tiếp từ ngoài | Thường không cần public vì backend là điểm gọi duy nhất |
| `HF_FALLBACK_COMPOSITE` | `true` | Fallback ghép ảnh minh họa khi provider chính lỗi, tránh trắng kết quả |

**Ảnh public cho FASHN:** FASHN API cần tải được ảnh người dùng qua URL public — vì vậy `FITME_STORAGE_MODE=r2` (mục 4) là **bắt buộc** khi dùng lựa chọn này trên VPS (khác với dev local dùng `AI_VTON_INTERNAL_FETCH_BASE_URL` để inline base64 ảnh localhost — không cần trên VPS vì backend + ai-vton cùng chạy sau Neon/R2 công khai).

**Build & chạy:**

```bash
docker compose -f docker-compose.hetzner.yml up -d --build backend ai-vton
docker compose -f docker-compose.hetzner.yml logs -f ai-vton
curl -s http://127.0.0.1:8001/health   # nếu ai-vton có endpoint /health tương tự backend
```

**RAM:** nếu tự host `ai-vton` cùng CX22 (4 GB), cân nhắc nâng lên **CX32** (8 GB) — cả backend Spring Boot + ai-vton Python cùng chạy dễ áp lực RAM hơn khi nhiều request try-on đồng thời.

---

## 8. Giữ Render làm backup lạnh

Frontend chỉ cần đổi **1 biến env** trên Vercel để chuyển toàn bộ traffic API sang backend khác — không cần sửa code (xem `frontend/next.config.ts`, rewrite `/api/v1/*` và `/uploads/*` dùng `BACKEND_INTERNAL_URL`).

### 8.1. Giữ Render ở trạng thái nào?

| Phương án | Chi phí | Thời gian failover | Khi nào dùng |
|-----------|---------|---------------------|--------------|
| **Free tier, để sleep** (khuyến nghị mặc định) | $0 | ~30–60s cold start lần đầu sau khi đổi `BACKEND_INTERNAL_URL` | Backup cho sự cố hiếm gặp, chấp nhận chậm vài chục giây lần đầu |
| **Starter, luôn chạy** | ~$7/tháng | Gần như tức thời | Cần backup "nóng" cho giai đoạn demo/ra mắt quan trọng, không chấp nhận cold start dù chỉ 1 lần |
| **Xoá hẳn service** | $0 | Phải tạo lại từ đầu (10–15 phút) | Không khuyến nghị — mất khả năng failover nhanh |

Mặc định khuyến nghị: **giữ Render free tier, để nó tự sleep** — không tốn thêm chi phí, vẫn có thể đánh thức trong ~1 phút khi cần.

### 8.2. Checklist trước khi fallback sang Render

- [ ] **Đánh thức Render trước** nếu đang ở free tier (service sleep sau ~15 phút không request): mở `https://fitme-ai-mvp.onrender.com/actuator/health`, đợi `{"status":"UP"}` (30–60s cold start) **trước khi** đổi `BACKEND_INTERNAL_URL` trên Vercel.
- [ ] Xác nhận `DB_URL` trên Render trỏ **cùng Neon project/database** đang dùng cho VPS (không phải Neon project cũ/khác).
- [ ] `JWT_SECRET` trên Render **giống hệt** giá trị đang set trên Vercel — nếu khác, user đang login sẽ bị văng ra (session cookie ký bằng secret cũ không hợp lệ).
- [ ] `CORS_ORIGINS` trên Render đã đúng domain Vercel hiện tại.
- [ ] Nếu dùng R2 cho storage, `R2_*` trên Render trỏ **cùng bucket** với VPS — ảnh user/wardrobe không bị mất khi swap.
- [ ] `AI_VTON_URL` trên Render trỏ tới service `ai-vton` **còn hoạt động** (nếu đang tự host `ai-vton` chỉ trên VPS — mục 7.2 — thì khi VPS down, cả try-on cũng cần fallback: dùng `ai-vton` trên Render hoặc chấp nhận try-on tạm gián đoạn cho tới khi VPS phục hồi).

### 8.3. Quy trình fallback (khi VPS gặp sự cố)

1. Chạy checklist [8.2](#82-checklist-trước-khi-fallback-sang-render) — đánh thức Render trước.
2. Đổi `BACKEND_INTERNAL_URL` trên Vercel từ `https://api.yourdomain.com` → `https://fitme-ai-mvp.onrender.com` → **Redeploy**.
3. Xác nhận Render **không** còn phục vụ traffic song song với VPS cùng lúc — nếu VPS chỉ bị chậm/lỗi từng phần (chưa hẳn down hoàn toàn), tắt hẳn container VPS để tránh 2 backend cùng ghi Neon:

```bash
# Trên VPS
docker compose -f docker-compose.hetzner.yml stop
```

4. Khi VPS đã khắc phục xong, đảo ngược quy trình: bật lại VPS (`docker compose -f docker-compose.hetzner.yml start`), verify health, rồi đổi `BACKEND_INTERNAL_URL` trên Vercel về `https://api.yourdomain.com` → Redeploy.

### 8.4. ⚠️ Cảnh báo — chỉ MỘT backend ghi Neon tại một thời điểm

**Không** chạy đồng thời VPS và Render cùng trỏ vào một Neon database với traffic thật (2 backend cùng ghi có thể đụng seed/migration, tạo race condition trên dữ liệu billing/try-on quota). Luôn đảm bảo backend không nhận traffic đã được `stop` hẳn nếu nghi ngờ nó vẫn có thể tự chạy job nền.

### 8.5. Diễn tập failover định kỳ (khuyến nghị)

Để chắc chắn backup thực sự dùng được khi cần, nên diễn tập định kỳ (vd. hàng tháng, hoặc trước mỗi đợt demo lớn):

1. Chạy thử checklist 8.2 + bước 1–2 của 8.3 trên **môi trường staging** hoặc ngoài giờ traffic thấp.
2. Xác nhận login, try-on, brand/admin portal hoạt động bình thường trên Render.
3. Đổi lại về VPS ngay sau khi xác nhận (không để Render phục vụ traffic thật lâu hơn cần thiết).

---

## 9. Vận hành: deploy, health check, start/stop

### 9.1. Deploy code mới (sau khi push lên `main`)

```bash
cd /opt/fitme
./deploy/hetzner/scripts/deploy-hetzner.sh
# hoặc, nếu đang tự host ai-vton (mục 7.2):
./deploy/hetzner/scripts/deploy-hetzner.sh --with-ai-vton
```

Script tự động `git pull` → `docker compose up -d --build` → chờ `/actuator/health` trả `UP` (timeout 180s, in log backend nếu lỗi). Tương đương thủ công:

```bash
cd /opt/fitme
git pull origin main
docker compose -f docker-compose.hetzner.yml up -d --build
docker compose -f docker-compose.hetzner.yml logs -f backend   # xác nhận khởi động OK
```

### 9.2. Health check

```bash
curl -s https://api.yourdomain.com/actuator/health
# {"status":"UP","components":{"db":{"status":"UP"},...,"geminiConfigured":true}}
```

Có thể cấu hình cron hoặc [UptimeRobot](https://uptimerobot.com) ping mỗi 5 phút để có cảnh báo sớm nếu container die — VPS không cần "giữ ấm" như Render, chỉ cần cảnh báo khi crash.

### 9.3. Xem log / debug

```bash
docker compose -f docker-compose.hetzner.yml logs --tail=200 backend
docker compose -f docker-compose.hetzner.yml exec backend sh   # vào container nếu cần
```

### 9.4. Start / stop để tiết kiệm chi phí (tùy chọn)

Nếu chỉ demo trong khung giờ cố định và muốn tiết kiệm thêm (Hetzner tính theo giờ khi server **đang chạy**, không tính khi **đã shutdown/xóa** — nhưng vẫn tính phí volume/IP nếu giữ server ở trạng thái stopped):

```bash
# Trên VPS — chỉ dừng container backend, giữ server chạy (không tiết kiệm tiền server, chỉ giảm CPU/RAM dùng)
docker compose -f docker-compose.hetzner.yml stop
docker compose -f docker-compose.hetzner.yml start
```

```bash
# Từ Hetzner Cloud Console / hcloud CLI — tắt hẳn server để không bị tính phí giờ chạy compute
hcloud server poweroff fitme-vps
hcloud server poweron fitme-vps
```

**Lưu ý:** nếu chỉ demo vài ngày, việc tắt/mở server sẽ đổi IP nếu không dùng Floating IP — cân nhắc giữ server chạy suốt "tuần demo" (chi phí rất thấp, xem mục 10) thay vì tắt/mở liên tục. Trong production dài hạn, khuyến nghị **giữ VPS chạy liên tục** — đây là backend chính, không phải môi trường tạm.

---

## 10. Chi phí: Hetzner vs Render free

| | Render Free (backup) | Render Starter (backup nóng) | Hetzner CX22 (chính) |
|---|---|---|---|
| Giá | $0 | ~$7/tháng | ~€3.79/tháng (~$4) |
| **Sleep sau 15 phút không request** | **Có** — cold start 30–60s lần request đầu | Không | Không |
| Ảnh hưởng nếu là backend chính | Người xem đầu tiên chờ ~1 phút, dễ tưởng app lỗi/treo | Ổn định | Ổn định |
| Ảnh hưởng webhook PayOS | Rủi ro timeout 10s nếu service đang sleep | Ổn | Ổn |
| Upload/disk | Ephemeral (`/tmp`) — mất khi restart | Ephemeral | Persistent volume Docker (vẫn khuyến nghị R2 cho ảnh) |
| Kiểm soát version Docker/Java | Giới hạn qua dashboard | Giới hạn qua dashboard | Toàn quyền SSH, dễ debug |
| Vai trò khuyến nghị | **Backup lạnh** | Backup nóng (tùy chọn, tốn thêm phí) | **Backend chính, production/demo** |

**Kết luận:** cho backend cần **luôn online, phản hồi nhanh, không lo cold-start trước mặt người dùng/nhà đầu tư/giám khảo demo**, chi phí ~$4/tháng của Hetzner CX22 rẻ hơn cả Render Starter và loại bỏ hoàn toàn vấn đề sleep — đây là lý do Hetzner được chọn làm **backend chính** thay vì chỉ là phương án phụ. Render free tier tiếp tục hữu ích như **backup $0** hoặc môi trường dev/test nhanh không cần quản lý VPS (xem [`DEPLOY_VERCEL_RENDER_NEON.md`](./DEPLOY_VERCEL_RENDER_NEON.md)).

---

## 11. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| `curl https://api.yourdomain.com` → SSL error / connection refused | DNS chưa propagate hoặc Caddy chưa xin được cert | Kiểm tra `nslookup api.yourdomain.com`, xem log `journalctl -u caddy -f` |
| Backend container restart loop | Sai `DB_URL`/thiếu `sslmode=require`, hoặc thiếu biến bắt buộc | `docker compose -f docker-compose.hetzner.yml logs backend` xem stack trace |
| `502 Bad Gateway` từ Caddy | Container backend chưa healthy hoặc crash | `docker compose ps`, `curl 127.0.0.1:8080/actuator/health` trực tiếp trên VPS |
| Frontend Vercel vẫn gọi Render dù đã đổi `BACKEND_INTERNAL_URL` | Quên **Redeploy** sau khi đổi env (rewrite build-time) | Trigger redeploy thủ công trên Vercel |
| Login bị văng ra sau khi cutover/fallback | `JWT_SECRET` không khớp giữa backend mới và Vercel | Đặt cùng giá trị `JWT_SECRET` ở cả VPS, Render và Vercel, redeploy cả hai |
| Ảnh user/wardrobe mất khi đổi backend | Storage local thay vì R2, hoặc khác bucket R2 | Dùng `FITME_STORAGE_MODE=r2` với **cùng bucket** cho cả VPS và Render |
| Try-on FASHN lỗi `person_url_unreachable` (tự host `ai-vton` trên VPS) | Ảnh user chưa public (chưa dùng R2, hoặc R2 chưa bật public access) | Set `FITME_STORAGE_MODE=r2`, kiểm tra `curl <R2_PUBLIC_BASE_URL>/...` trả 200 |
| `ai-vton` container không gọi được backend (self-host cùng VPS) | Sai tên service trong `AI_VTON_URL` (phải dùng tên service Docker, không phải `localhost`) | Dùng `http://ai-vton:8001` / `http://backend:8080` theo docker network nội bộ, không dùng `127.0.0.1` giữa 2 container |
| Out of memory / container bị OOM-killed | JVM heap mặc định quá cao cho RAM VPS, hoặc chạy thêm `ai-vton` trên CX22 | Set `JAVA_TOOL_OPTIONS=-Xmx1536m` trong `.env.hetzner`; cân nhắc nâng CX32 nếu tự host `ai-vton` |
| `docker: permission denied` | User chưa vào group `docker` | `usermod -aG docker $USER` rồi logout/login lại |
| Sau cutover, Render vẫn nhận traffic lạ | Redeploy Vercel chưa xong, hoặc CDN/cache cũ | Kiểm tra Vercel deployment log, xoá cache trình duyệt/CDN nếu có |

---

## Xem thêm

- [`HETZNER_CUTOVER_CHECKLIST.md`](./HETZNER_CUTOVER_CHECKLIST.md) — checklist ngắn "✅ đã có sẵn trong repo" vs "👤 bạn tự làm", theo đúng thứ tự thực hiện.
- [`DEPLOY_VERCEL_RENDER_NEON.md`](./DEPLOY_VERCEL_RENDER_NEON.md) — setup Vercel (frontend) + Neon (DB) + Render (**backup**), biến môi trường đầy đủ, seed demo, PayOS webhook.
- [`.env.cloud.example`](../.env.cloud.example) — template biến môi trường dùng chung cho cloud.
- [`deploy/hetzner/`](../deploy/hetzner/) — `.env.hetzner.example`, `Caddyfile.example`, `scripts/deploy-hetzner.sh`.
- [`docker-compose.hetzner.yml`](../docker-compose.hetzner.yml) — compose file production dùng trên VPS.
