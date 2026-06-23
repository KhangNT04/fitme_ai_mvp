# FitMe AI

Web app tư vấn thời trang cá nhân hóa bằng AI — gợi ý outfit, size, form, màu sắc, preview 2D minh họa, và chuyển hướng mua hàng qua kênh bán ngoài (Shopee/TikTok/website brand).

## Kiến trúc

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

## Chạy nhanh với Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/v1
- Swagger UI: http://localhost:8080/swagger-ui.html

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

**Full QA:** **26** unit tests — thêm `ai/processing`, `consultation-store`, `use-ensure-session`.

17 unit tests gốc: validators, format-price, api-client, recommendation mapping, Disclaimer, session store.

### E2E (Playwright)

```bash
cd frontend
npm run dev          # terminal 1
npm run test:e2e     # terminal 2
```

**Full QA:** **72** E2E tests — 6 luồng tài liệu + smoke routes + auth/RBAC + brand/admin portal full + AI/try-on sub-pages + saved-outfits.

Yêu cầu: Backend `:8080` + frontend `:3000` đang chạy (xem [`docs/QA_REPORT.md`](docs/QA_REPORT.md)).

```bash
bash scripts/test-all.sh   # chạy BE + FE unit (từ repo root)
```

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

## Tài liệu phát triển

- [Backend Development Guide](FitMe_AI_BACKEND_DEVELOPMENT_GUIDE.md)
- [Frontend Development Guide](FitMe_AI_FRONTEND_DEVELOPMENT_GUIDE.md)
