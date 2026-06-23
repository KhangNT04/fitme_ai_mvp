# FitMe AI — Deploy môi trường Test

Hướng dẫn triển khai **test/staging** trên một máy chủ (VPS, LAN, hoặc local) bằng Docker Compose.

## Kiến trúc test

```
Browser → :3000 (frontend)
              └─ /api/v1/* → proxy → backend:8080 (Docker network)
              └─ pages      → Next.js standalone

postgres (internal, không expose ra ngoài)
backend  (internal, không expose — API qua frontend proxy)
```

Frontend dùng **`/api/v1`** (same-origin) nên hoạt động với `http://IP:3000` mà không cần hardcode `localhost:8080`.

## Yêu cầu

- Docker 24+ & Docker Compose v2
- RAM ≥ 4GB (build frontend cần ~2GB)
- Port **3000** trống trên host (hoặc đổi `APP_PORT`)

## Deploy nhanh (local test)

### Windows

```powershell
cd fitme
.\scripts\deploy-test.ps1
```

### Linux / macOS

```bash
cd fitme
chmod +x scripts/deploy-test.sh
./scripts/deploy-test.sh
```

Script sẽ:

1. Tạo `.env.test` từ `.env.test.example` (nếu chưa có)
2. `docker compose -f docker-compose.test.yml up -d --build`

Mở **http://localhost:3000**

## Deploy trên VPS / LAN

1. Clone repo:

```bash
git clone https://github.com/KhangNT04/fitme_ai_mvp.git
cd fitme_ai_mvp
```

2. Tạo và chỉnh `.env.test`:

```bash
cp .env.test.example .env.test
```

| Biến | Ví dụ | Ghi chú |
|------|-------|---------|
| `PUBLIC_APP_URL` | `http://203.0.113.10:3000` | URL người dùng mở — **bắt buộc khớp CORS** |
| `POSTGRES_PASSWORD` | chuỗi ngẫu nhiên | Đổi khỏi default |
| `JWT_SECRET` | ≥32 ký tự random | Đổi khỏi default |
| `APP_PORT` | `3000` | Port host |
| `FITME_SEED_ENABLED` | `true` | Demo data lần đầu |
| `FITME_SEED_PASSWORD` | `fitme123` | Mật khẩu tài khoản seed |

3. Deploy:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml up -d --build
```

4. Mở firewall port `APP_PORT` (3000).

5. Truy cập: `http://YOUR_SERVER_IP:3000`

## Tài khoản demo (seed)

Chỉ tạo khi DB trống và `FITME_SEED_ENABLED=true`:

| Email | Vai trò |
|-------|---------|
| admin@fitme.ai | Admin |
| brand@fitme.ai | Brand |
| user@fitme.ai | User |

Mật khẩu: giá trị `FITME_SEED_PASSWORD` (mặc định `fitme123`).

## Lệnh vận hành

```bash
# Logs
docker compose --env-file .env.test -f docker-compose.test.yml logs -f

# Restart
docker compose --env-file .env.test -f docker-compose.test.yml restart

# Dừng (giữ data)
docker compose --env-file .env.test -f docker-compose.test.yml down

# Dừng + xóa DB/uploads test
docker compose --env-file .env.test -f docker-compose.test.yml down -v
```

## Debug API trực tiếp (tùy chọn)

Expose backend ra port 8080 (Swagger, Postman):

```bash
docker compose --env-file .env.test -f docker-compose.test.yml --profile debug-api up -d
```

- Swagger: http://localhost:8080/swagger-ui.html (qua nginx proxy)

## Kiểm tra sau deploy

```bash
curl -s http://localhost:3000/api/v1/products | head
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Kỳ vọng: HTTP 200, JSON `success: true`.

## Dev local (không Docker)

```bash
docker compose up postgres -d   # hoặc PG riêng
cd backend && mvn spring-boot:run
cd frontend && cp .env.local.example .env.local && npm run dev
```

Frontend dev dùng rewrite `/api/v1` → `localhost:8080`.

## Khác biệt test vs production

| Hạng mục | Test (hiện tại) | Production |
|----------|-----------------|------------|
| HTTPS | HTTP :3000 | Cần reverse proxy + TLS |
| Secrets | `.env.test` | Secret manager / vault |
| Seed demo | Bật được | **Tắt** `FITME_SEED_ENABLED=false` |
| Postgres | Volume Docker | Managed DB / backup |
| CI | Manual deploy | GitHub Actions / pipeline |

## Troubleshooting

**Port 5432/3000 busy** — đổi `APP_PORT` trong `.env.test`; postgres test không bind host port.

**CORS lỗi** — `PUBLIC_APP_URL` phải khớp chính xác URL trình duyệt (scheme + host + port).

**Frontend build fail OOM** — tăng RAM Docker Desktop hoặc build trên CI rồi pull image.

**API 502 qua /api/v1** — backend chưa sẵn sàng: `docker compose ... logs backend`
