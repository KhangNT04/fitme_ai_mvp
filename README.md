# FitMe AI

[![CI](https://github.com/KhangNT04/fitme_ai_mvp/actions/workflows/ci.yml/badge.svg)](https://github.com/KhangNT04/fitme_ai_mvp/actions/workflows/ci.yml)

Web app tư vấn thời trang cá nhân hóa bằng AI — gợi ý outfit, size, form, màu sắc, preview 2D minh họa, và chuyển hướng mua hàng qua kênh bán ngoài (Shopee/TikTok/website brand).

## Kiến trúc

Chi tiết: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · API: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) · Sử dụng: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) · Dev: [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md)

| Thành phần | Công nghệ |
|------------|-----------|
| Backend | Java 21, Spring Boot 3.3, PostgreSQL, Flyway, JWT |
| Frontend | Next.js App Router, TypeScript, TailwindCSS, TanStack Query, Zustand |
| DevOps | Docker Compose |

## Yêu cầu

- Java 21+
- Maven 3.9+
- Node.js 20+
- Docker & Docker Compose (khuyến nghị)

## Luồng 3 vai trò (MVP)

### USER (Người dùng)
1. Đăng ký / đăng nhập tại `/auth/register`, `/auth/login`
2. Tư vấn AI ẩn danh hoặc đã login — lưu profile, wardrobe, saved outfits
3. Quản lý hồ sơ tại `/profile`, quyền riêng tư tại `/profile/privacy`
4. Reset mật khẩu: `/auth/forgot-password` → `/auth/reset-password`

### BRAND_OWNER (Đối tác thương hiệu)
1. Đăng ký USER → gửi đơn tại `/brand/onboarding`
2. Chờ admin duyệt — theo dõi tại `/brand/pending`
3. Sau khi duyệt: **đăng xuất và đăng nhập lại** → portal `/brand/login`
4. Quản lý sản phẩm, analytics, cài đặt brand

### ADMIN
1. Đăng nhập `/admin/login` (tài khoản seed hoặc DB)
2. Duyệt brand (nâng role USER → BRAND_OWNER), duyệt/flag sản phẩm
3. Quản lý rules, flagged links, privacy requests, try-on monitoring

**Tài khoản demo (seed):** `admin@fitme.ai`, `brand@fitme.ai`, `user@fitme.ai` / `fitme123`

## Chạy nhanh với Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- API (qua proxy FE): http://localhost:3000/api/v1
- Backend trực tiếp (dev compose): http://localhost:8080/api/v1
- Swagger UI: http://localhost:8080/swagger-ui.html

## Deploy môi trường test (staging)

Dùng stack Docker riêng với secrets bắt buộc, Postgres nội bộ, API proxy qua frontend (truy cập được qua IP server):

```powershell
# Windows
.\scripts\deploy-test.ps1
```

```bash
# Linux / macOS
cp .env.test.example .env.test   # chỉnh PUBLIC_APP_URL + secrets
./scripts/deploy-test.sh
```

Chi tiết: [`docs/DEPLOY_TEST.md`](docs/DEPLOY_TEST.md) · Hướng dẫn user truy cập URL deploy: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md#1-truy-cập-app--đường-dẫn-deploy)

## Deploy free cloud (Vercel + Render + Neon)

Stack **0 đồng**, link public `https://*.vercel.app`:

| Dịch vụ | Vai trò |
|---------|---------|
| [Vercel](https://vercel.com) | Frontend Next.js |
| [Render](https://render.com) free | Backend Spring Boot (Docker) |
| [Neon](https://neon.tech) free | PostgreSQL |

Hướng dẫn từng bước: [`docs/DEPLOY_VERCEL_RENDER_NEON.md`](docs/DEPLOY_VERCEL_RENDER_NEON.md) · User dùng link deploy: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md#1-truy-cập-app--đường-dẫn-deploy)

Template biến môi trường: [`.env.cloud.example`](.env.cloud.example)

## Chạy local (development)

### 1. PostgreSQL

```bash
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # hoặc tạo .env.local
npm install
npm run dev
```

Frontend: http://localhost:3000

## Tài khoản demo (seed tự động)

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| admin@fitme.ai | fitme123 | Admin |
| brand@fitme.ai | fitme123 | Brand Owner |
| user@fitme.ai | fitme123 | User |

## Luồng demo chính

1. Vào trang chủ → **Bắt đầu tư vấn outfit** (không cần đăng nhập)
2. Nhập thông tin cơ thể, gu thời trang, hoàn cảnh
3. Xem kết quả gợi ý outfit + size/form/màu
4. Bấm **Mua ngay** → xác nhận redirect → chuyển đến kênh bán
5. Brand portal (`/brand/login`) — quản lý sản phẩm, xem analytics
6. Admin portal (`/admin/login`) — duyệt brand/sản phẩm, quản lý rules

## Cấu trúc thư mục

```
fitme/
  backend/          Spring Boot modular monolith
  frontend/         Next.js App Router
  docker-compose.yml
  FitMe_AI_*_GUIDE.md
```

## API chính

Base path: `/api/v1`

- `POST /sessions/anonymous` — tạo session ẩn danh
- `GET /products` — danh sách sản phẩm
- `POST /recommendations` — tạo gợi ý outfit
- `POST /redirects/buy-click` — track click + redirect URL
- `POST /auth/login` — đăng nhập JWT

Header cho session ẩn danh: `X-Anonymous-Session: <token>`

## Lưu ý MVP

- FitMe AI **không** xử lý thanh toán, đơn hàng, vận chuyển
- Preview AI là **minh họa tham khảo**, không đảm bảo giống thật 100%
- Analytics brand chỉ hiển thị dữ liệu **tổng hợp**, không expose ảnh/số đo người dùng

## Kiểm thử (Testing)

### CI (GitHub Actions)

Mỗi PR/push chạy: backend `mvn test`, frontend `npm test` + `npm run build`, E2E `smoke-routes` + `role-flows`.

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

E2E local (Linux/macOS): `bash scripts/ci-e2e.sh`

### Backend (JUnit + Testcontainers)

```bash
cd backend
mvn test
```

28 integration/unit tests: session, profile, recommendation, redirect, security, URL validation.

**Full QA (2026-06-24):** **40** tests — thêm wardrobe, photo upload, try-on, brand/admin products, analytics.  
Chi tiết: [`docs/QA_REPORT.md`](docs/QA_REPORT.md)

Yêu cầu: Docker Desktop đang chạy (PostgreSQL test container).

### Frontend (Vitest)

```bash
cd frontend
npm test
```

**OneDrive workaround:** Vitest/build trên đường dẫn OneDrive có thể fail — chạy từ bản copy tạm:

```powershell
xcopy /E /I /Y "%CD%" "$env:TEMP\fitme-fe-vitest"
cd $env:TEMP\fitme-fe-vitest\frontend
npm test
```

**Full QA:** **28+** unit tests — thêm `product-mapper`, `upload-api` normalize.

### E2E (Playwright)

```bash
cd frontend
npm run dev          # terminal 1
npm run test:e2e     # terminal 2
npm run test:e2e:roles   # 29 luồng 3-role (brand form có URL ảnh)
```

Reset password E2E (`e2e/reset-password.spec.ts`): backend cần `FITME_TEST_EXPOSE_RESET_TOKENS=true`.

**Brand sản phẩm:** ảnh nhập bằng **URL** (1 URL/dòng), không upload file lên cloud trong MVP.

**Full QA:** **72+** E2E tests — 6 luồng tài liệu + smoke routes + auth/RBAC + brand/admin portal full + AI/try-on sub-pages + saved-outfits.

Yêu cầu: Backend `:8080` + frontend `:3000` đang chạy (xem [`docs/QA_REPORT.md`](docs/QA_REPORT.md)).

```bash
bash scripts/test-all.sh   # chạy BE + FE unit (từ repo root)
```

### Test từng flow / màn hình (Windows)

Chạy unit + E2E **từng spec** (mỗi file = một luồng hoặc nhóm màn hình), có bảng kết quả:

```powershell
.\scripts\test-flows.ps1
# hoặc từ frontend:
npm run test:flows
```

Chỉ E2E (bỏ unit):

```powershell
.\scripts\test-flows.ps1 -E2eOnly
```

Yêu cầu: backend `:8080` + frontend `:3000` đang chạy.

### Acceptance criteria đã verify qua test

- Anonymous session + profile save + recommendation generation
- Buy click tracking trước redirect
- GET `/recommendations/saved` sau khi lưu outfit
- Session link-to-user migrate dữ liệu session
- WardrobeMode enum đồng bộ FE/BE
- Role guard brand/admin (middleware + login validation)

## Seed config (tùy chọn)

Trong `application.yml` hoặc env:

```yaml
fitme.seed.admin-email: admin@fitme.ai
fitme.seed.brand-email: brand@fitme.ai
fitme.seed.user-email: user@fitme.ai
fitme.seed.password: fitme123
```

## Tài liệu

| Tài liệu | Đối tượng |
|----------|-----------|
| [Hướng dẫn sử dụng 3 role + test](docs/USER_GUIDE.md) | QA, PM, demo, **người dùng bản deploy** |
| [Hướng dẫn developer](docs/DEVELOPER_GUIDE.md) | Dev mới onboard |
| [Kiến trúc](docs/ARCHITECTURE.md) | Overview kỹ thuật |
| [API contract](docs/API_CONTRACT.md) | Mapping FE ↔ BE |
| [QA report](docs/QA_REPORT.md) | Kết quả regression |

### Tài liệu phát triển (legacy)

- [Backend Development Guide](FitMe_AI_BACKEND_DEVELOPMENT_GUIDE.md)
- [Frontend Development Guide](FitMe_AI_FRONTEND_DEVELOPMENT_GUIDE.md)
