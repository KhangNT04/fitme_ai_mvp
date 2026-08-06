# Deploy FitMe AI — Hetzner VPS (Docker) làm backend chính

Mục tiêu: backend Spring Boot **luôn online** (không sleep) cho tuần demo, dùng **Hetzner Cloud VPS + Docker**. Render (free/starter) giữ vai trò **backup** khi VPS gặp sự cố. Frontend (Vercel) và database (Neon) **không đổi** — xem [`DEPLOY_VERCEL_RENDER_NEON.md`](./DEPLOY_VERCEL_RENDER_NEON.md) cho 2 phần đó.

```
Người dùng → Vercel (Next.js)
                └─ /api/v1/* → rewrite (BACKEND_INTERNAL_URL)
                                  ├─ CHÍNH:   https://api.yourdomain.com  (Hetzner VPS, Docker + Caddy)
                                  └─ BACKUP:  https://fitme-ai-mvp.onrender.com  (Render)
                                                            │
                                                            └─ Neon (PostgreSQL) — DÙNG CHUNG 1 DB
```

**Nguyên tắc quan trọng:** tại một thời điểm, chỉ **MỘT** backend (VPS *hoặc* Render) được ghi vào Neon. Không chạy song song cả hai trỏ cùng DB — xem mục [6](#6-chuyển-frontend-giữa-vps-và-render-backup).

---

## Mục lục

1. [Chọn gói Hetzner](#1-chọn-gói-hetzner)
2. [Bootstrap server](#2-bootstrap-server-docker--ufw--reverse-proxy)
3. [Chạy backend FitMe từ repo](#3-chạy-backend-fitme-từ-repo)
4. [Checklist biến môi trường](#4-checklist-biến-môi-trường-env)
5. [Domain: api.yourdomain.com → VPS](#5-domain-apiyourdomaincom--vps)
6. [Chuyển frontend giữa VPS và Render backup](#6-chuyển-frontend-giữa-vps-và-render-backup)
7. [Vận hành: update, health check, start/stop](#7-vận-hành-update-health-check-startstop)
8. [Chi phí: Hetzner vs Render free (vì sao cần always-on)](#8-chi-phí-hetzner-vs-render-free)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Chọn gói Hetzner

| Gói | Cấu hình | Giá (~) | Ghi chú |
|-----|----------|---------|---------|
| **CX22** (khuyến nghị) | 2 vCPU, 4 GB RAM, 40 GB SSD | ~€3.79/tháng | Đủ chạy 1 container Spring Boot + Caddy; JVM mặc định ăn ~300–500 MB |
| CX32 | 4 vCPU, 8 GB RAM, 80 GB SSD | ~€6.80/tháng | Dự phòng nếu chạy thêm `ai-vton` container hoặc test tải nặng |
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

**Lưu ý:** KHÔNG mở port `8080` ra ngoài — backend chỉ nghe `127.0.0.1:8080`, reverse proxy (Caddy/nginx) mới expose 80/443 ra internet.

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

Tạo `/etc/caddy/Caddyfile` (thay `api.yourdomain.com` bằng domain thật, xem [mục 5](#5-domain-apiyourdomaincom--vps) để trỏ DNS trước):

```caddyfile
api.yourdomain.com {
    reverse_proxy localhost:8080
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

```bash
cd /opt/fitme
cp .env.cloud.example .env.hetzner   # tham khảo rồi điền giá trị thật
nano .env.hetzner
```

Điền đầy đủ theo [checklist mục 4](#4-checklist-biến-môi-trường-env). **Không đưa file này vào git** (đã có `.gitignore` chặn `.env*` ở root — kiểm tra lại nếu tạo tên khác).

### 3.3. File compose riêng cho VPS

Root `docker-compose.yml` trong repo dùng cho **dev local** (có Postgres container). Trên VPS, tạo file **mới** `docker-compose.hetzner.yml` (không đè file compose local):

```yaml
# docker-compose.hetzner.yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env.hetzner
    ports:
      - "127.0.0.1:8080:8080"   # chỉ bind localhost — Caddy/nginx proxy ra ngoài
    volumes:
      - backend_uploads:/app/uploads

volumes:
  backend_uploads:
```

> Nếu `FITME_STORAGE_MODE=r2` (khuyến nghị — xem mục 4), volume `backend_uploads` chỉ dùng cho upload tạm/log; ảnh thật lưu trên R2 nên **không phụ thuộc** disk VPS. Điều này cũng giúp ảnh hiển thị đúng dù sau này chuyển đổi qua lại giữa VPS ⇄ Render.

### 3.4. Build & chạy

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

Giống hệt bộ biến dùng cho Render (để có thể **swap qua lại** dễ dàng — xem mục 6), chỉ khác `FITME_PUBLIC_BASE_URL` và không có giới hạn free tier.

| Biến | Giá trị VPS | Ghi chú |
|------|-------------|---------|
| `SPRING_PROFILES_ACTIVE` | `prod` | Tắt Swagger, seed mặc định off |
| `DB_URL` | `jdbc:postgresql://ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` | **Cùng Neon project** với Render (nếu dùng backup) |
| `DB_USERNAME` | user Neon | |
| `DB_PASSWORD` | password Neon | |
| `JWT_SECRET` | chuỗi random ≥32 ký tự | **Phải trùng** với Render + Vercel để không phải re-login khi swap backend |
| `CORS_ORIGINS` | `https://fitme-ai-mvp.vercel.app` | Đúng domain Vercel, không slash cuối |
| `FITME_SEED_ENABLED` | `false` | Bật `true` chỉ khi cần seed DB trống lần đầu |
| `FITME_SEED_FASHION_REFRESH` | `true` | Đồng bộ catalog thời trang khi khởi động |
| `FITME_SEED_PASSWORD` | mật khẩu mạnh | Chỉ cần khi bật seed |
| `UPLOAD_DIR` | `/app/uploads` | Volume Docker — persistent trên VPS (khác Render `/tmp`) |
| `FITME_PUBLIC_BASE_URL` | `https://api.yourdomain.com` | URL public backend — **khác Render**, dùng cho link ảnh/VTON |
| `FITME_FRONTEND_BASE_URL` | `https://fitme-ai-mvp.vercel.app` | Cho ảnh catalog phục vụ từ Vercel |
| `FITME_STORAGE_MODE` | `r2` | Khuyến nghị dùng R2 cho cả VPS lẫn Render — ảnh không "kẹt" theo 1 backend |
| `R2_ENDPOINT` / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_PUBLIC_BASE_URL` | Cloudflare R2 | **Cùng bucket** với Render nếu muốn swap không mất ảnh |
| `FITME_AI_STYLIST_MODE` | `gemini` | `rule` nếu tắt Gemini |
| `GEMINI_API_KEY` | key từ [Google AI Studio](https://aistudio.google.com/apikey) | |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `GEMINI_TIMEOUT_MS` | `15000` | VPS always-on, không cold-start — có thể để thấp hơn Render (`25000`) |
| `FITME_AI_MODE` | `hf` hoặc `api` | Gọi service `ai-vton` (mock chỉ dev). `api` = FASHN hosted API (`FASHN_API_KEY` đặt trên `ai-vton`, không đặt ở đây) |
| `AI_VTON_URL` | `https://fitme-ai-vton.onrender.com` | Có thể giữ nguyên trên Render, hoặc tự host trên VPS (xem ghi chú dưới) |
| `PAYOS_MOCK` | `true`/`false` | Giống cấu hình Render đang dùng |
| `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL` | trỏ về Vercel | |
| `PAYOS_CLIENT_ID` / `PAYOS_API_KEY` / `PAYOS_CHECKSUM_KEY` | chỉ khi `PAYOS_MOCK=false` | |

**Ghi chú `ai-vton`:** service này gọi API HuggingFace/Replicate bên ngoài — vẫn có thể tiếp tục dùng bản deploy trên Render (`fitme-ai-vton.onrender.com`), backend trên VPS chỉ cần trỏ `AI_VTON_URL` tới đó. Chỉ tự host `ai-vton` trên VPS nếu muốn loại bỏ hoàn toàn phụ thuộc Render (dùng profile `ai` trong compose gốc làm tham khảo, thêm service tương tự vào `docker-compose.hetzner.yml`).

Tham khảo template gốc: [`.env.cloud.example`](../.env.cloud.example).

---

## 5. Domain: `api.yourdomain.com` → VPS

1. Vào DNS provider của domain bạn (Cloudflare, Namecheap, v.v.).
2. Tạo bản ghi **A**:

   | Type | Name | Value | Proxy |
   |------|------|-------|-------|
   | A | `api` | `203.0.113.10` (IP VPS) | **DNS only** (tắt proxy Cloudflare orange-cloud khi mới cấp SSL, để Caddy/certbot xác thực HTTP-01 trực tiếp) |

3. Đợi DNS propagate (thường 1–10 phút, `nslookup api.yourdomain.com` để kiểm tra).
4. Chạy Caddy/certbot ở [mục 2.5](#25-reverse-proxy--lets-encrypt--caddy-khuyến-nghị-đơn-giản-nhất) — chỉ hoạt động **sau khi** DNS đã trỏ đúng.
5. (Tùy chọn) Sau khi có SSL, có thể bật lại Cloudflare proxy (orange-cloud) để có thêm DDoS protection/cache — không bắt buộc cho demo.

Domain frontend (`fitme-ai-mvp.vercel.app` hoặc domain riêng của bạn trên Vercel) **giữ nguyên**, không đổi.

---

## 6. Chuyển frontend giữa VPS và Render backup

Frontend chỉ cần đổi **1 biến env** trên Vercel để chuyển toàn bộ traffic API sang backend khác — không cần sửa code (xem `frontend/next.config.ts`, rewrite `/api/v1/*` và `/uploads/*` dùng `BACKEND_INTERNAL_URL`).

### 6.1. Đổi trên Vercel

Vercel dashboard → Project → **Settings → Environment Variables**:

| Biến | Dùng VPS (chính) | Dùng Render (backup) |
|------|-------------------|------------------------|
| `BACKEND_INTERNAL_URL` | `https://api.yourdomain.com` | `https://fitme-ai-mvp.onrender.com` |
| `NEXT_PUBLIC_API_URL` | `/api/v1` (không đổi) | `/api/v1` (không đổi) |
| `JWT_SECRET` | phải **trùng** backend đang active | phải **trùng** backend đang active |

Sau khi sửa `BACKEND_INTERNAL_URL` → **Redeploy** (hoặc trigger deploy mới) để Next.js build lại rewrite rules.

### 6.2. Checklist trước khi fallback sang Render

- [ ] **Đánh thức Render trước** nếu đang ở free tier (service sleep sau ~15 phút không request): mở `https://fitme-ai-mvp.onrender.com/actuator/health`, đợi `{"status":"UP"}` (30–60s cold start) **trước khi** đổi `BACKEND_INTERNAL_URL` trên Vercel.
- [ ] Xác nhận `DB_URL` trên Render trỏ **cùng Neon project/database** đang dùng cho VPS (không phải Neon project cũ/khác).
- [ ] `JWT_SECRET` trên Render **giống hệt** giá trị đang set trên Vercel — nếu khác, user đang login sẽ bị văng ra (session cookie ký bằng secret cũ không hợp lệ).
- [ ] `CORS_ORIGINS` trên Render đã đúng domain Vercel hiện tại.
- [ ] Nếu dùng R2 cho storage, `R2_*` trên Render trỏ **cùng bucket** với VPS — ảnh user/wardrobe không bị mất khi swap.

### 6.3. ⚠️ Cảnh báo — chỉ MỘT backend ghi Neon tại một thời điểm

**Không** chạy đồng thời VPS và Render cùng trỏ vào một Neon database với traffic thật (2 backend cùng ghi có thể đụng seed/migration, tạo race condition trên dữ liệu billing/try-on quota). Quy trình an toàn khi cần fallback:

1. Đổi `BACKEND_INTERNAL_URL` trên Vercel sang backend còn lại → Redeploy.
2. Dừng hoặc để backend cũ tự tắt (không cần xóa) — chỉ cần đảm bảo **không có traffic** đi vào nó nữa (Vercel đã ngừng route tới đó).
3. Nếu VPS gặp sự cố dài hạn, có thể tắt hẳn container trên VPS (`docker compose -f docker-compose.hetzner.yml stop`) để chắc chắn không có tiến trình nào khác vô tình ghi DB.

---

## 7. Vận hành: update, health check, start/stop

### 7.1. Deploy code mới (sau khi push lên `main`)

```bash
cd /opt/fitme
git pull origin main
docker compose -f docker-compose.hetzner.yml up -d --build
docker compose -f docker-compose.hetzner.yml logs -f backend   # xác nhận khởi động OK
```

### 7.2. Health check

```bash
curl -s https://api.yourdomain.com/actuator/health
# {"status":"UP","components":{"db":{"status":"UP"},...,"geminiConfigured":true}}
```

Có thể cấu hình cron hoặc [UptimeRobot](https://uptimerobot.com) ping mỗi 5 phút để có cảnh báo sớm nếu container die — VPS không cần "giữ ấm" như Render, chỉ cần cảnh báo khi crash.

### 7.3. Xem log / debug

```bash
docker compose -f docker-compose.hetzner.yml logs --tail=200 backend
docker compose -f docker-compose.hetzner.yml exec backend sh   # vào container nếu cần
```

### 7.4. Start / stop để tiết kiệm chi phí (tùy chọn)

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

**Lưu ý:** nếu chỉ demo vài ngày, việc tắt/mở server sẽ đổi IP nếu không dùng Floating IP — cân nhắc giữ server chạy suốt "tuần demo" (chi phí rất thấp, xem mục 8) thay vì tắt/mở liên tục.

---

## 8. Chi phí: Hetzner vs Render free

| | Render Free | Render Starter | Hetzner CX22 |
|---|---|---|---|
| Giá | $0 | ~$7/tháng | ~€3.79/tháng (~$4) |
| **Sleep sau 15 phút không request** | **Có** — cold start 30–60s lần request đầu | Không | Không |
| Ảnh hưởng demo trực tiếp | Người xem đầu tiên chờ ~1 phút, dễ tưởng app lỗi/treo | Ổn định | Ổn định |
| Ảnh hưởng webhook PayOS | Rủi ro timeout 10s nếu service đang sleep | Ổn | Ổn |
| Upload/disk | Ephemeral (`/tmp`) — mất khi restart | Ephemeral | Persistent volume Docker (nên vẫn khuyến nghị R2 cho ảnh) |
| Kiểm soát version Docker/Java | Giới hạn qua dashboard | Giới hạn qua dashboard | Toàn quyền SSH, dễ debug |

**Kết luận:** cho **tuần demo cần luôn online, phản hồi nhanh, không lo cold-start trước mặt người xem**, chi phí ~$4/tháng của Hetzner CX22 rẻ hơn Render Starter và loại bỏ hoàn toàn vấn đề sleep của Render Free. Sau tuần demo, có thể xóa server Hetzner (tính phí theo giờ) và quay lại dùng Render free cho giai đoạn phát triển tiếp theo.

---

## 9. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| `curl https://api.yourdomain.com` → SSL error / connection refused | DNS chưa propagate hoặc Caddy chưa xin được cert | Kiểm tra `nslookup api.yourdomain.com`, xem log `journalctl -u caddy -f` |
| Backend container restart loop | Sai `DB_URL`/thiếu `sslmode=require`, hoặc thiếu biến bắt buộc | `docker compose -f docker-compose.hetzner.yml logs backend` xem stack trace |
| `502 Bad Gateway` từ Caddy/nginx | Container backend chưa healthy hoặc crash | `docker compose ps`, `curl 127.0.0.1:8080/actuator/health` trực tiếp trên VPS |
| Frontend Vercel vẫn gọi Render dù đã đổi `BACKEND_INTERNAL_URL` | Quên **Redeploy** sau khi đổi env (rewrite build-time) | Trigger redeploy thủ công trên Vercel |
| Login bị văng ra sau khi swap backend | `JWT_SECRET` không khớp giữa backend mới và Vercel | Đặt cùng giá trị `JWT_SECRET` ở cả 2 nơi, redeploy cả hai |
| Ảnh user/wardrobe mất khi đổi backend | Storage local thay vì R2, hoặc khác bucket R2 | Dùng `FITME_STORAGE_MODE=r2` với **cùng bucket** cho cả VPS và Render |
| Out of memory / container bị OOM-killed | JVM heap mặc định quá cao cho RAM VPS | Set `JAVA_TOOL_OPTIONS=-Xmx1536m` trong `.env.hetzner`, restart |
| `docker: permission denied` | User chưa vào group `docker` | `usermod -aG docker $USER` rồi logout/login lại |

---

## Xem thêm

- [`DEPLOY_VERCEL_RENDER_NEON.md`](./DEPLOY_VERCEL_RENDER_NEON.md) — setup Vercel (frontend) + Neon (DB) + Render (backup backend), biến môi trường đầy đủ, seed demo, PayOS webhook.
- [`.env.cloud.example`](../.env.cloud.example) — template biến môi trường dùng chung cho cloud.
