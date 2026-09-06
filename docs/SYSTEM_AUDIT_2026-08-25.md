# FitMe AI — Báo cáo rà soát toàn hệ thống

**Ngày:** 2026-08-25  
**Phạm vi:** Luồng nghiệp vụ, tính năng, bảo mật, kiến trúc/ops, khoảng trống so với góp ý GV và roadmap AI  
**Cách làm:** Đọc code + cấu hình + tài liệu hiện tại; đối chiếu `docs/CAI_THIEN_DU_AN_FITME.md`, `docs/AI_ROADMAP.md`, `docs/IMPLEMENTATION_NOTES_CAI_THIEN.md`  
**Môi trường tham chiếu:** Local Docker (`docker-compose.local.yml`) — frontend `:3000`, backend `:8080`, Postgres host **`:5432`**, ai-vton `:8001`; test DB fallback **`:55432`** (`fitme-test-postgres`)

> Báo cáo QA cũ [`QA_REPORT.md`](./QA_REPORT.md) (2026-06-24) **không còn phản ánh** số test và kiến trúc hiện tại. Dùng file này làm snapshot mới.

---

## 1. Tóm tắt điều hành

FitMe **đủ xương sống để demo thesis / MVP**: tư vấn stylist chat, try-on async, discover → redirect mua, wardrobe/saved outfits, portal brand (kèm billing PayOS mock/live), portal admin (duyệt brand/SP, gói, rules, partnership, monitor try-on). Định vị Gen Z + brand-coherent scoring (Must phase A) **đã ship**.

Ba nhóm việc còn lại:

| Mức | Việc | Ảnh hưởng |
|-----|------|-----------|
| **P0 — vận hành / bảo mật** | `PAYOS_MOCK=true` mặc định cấp quota không thanh toán; JWT secret mặc định; ảnh `/uploads/**` public; ai-vton không auth + SSRF; xóa dữ liệu chỉ đổi status | Không đưa billing/prod “thật” khi còn mock; rủi ro PII |
| **P1 — sản phẩm phase B** | Consumer Plus chưa thu tiền (PayOS B2C); email verify/reset mock; không rate-limit login | Demo được, chưa monetize user |
| **P2 — phase C / AI** | Embeddings service chưa nối recommendation; wardrobe AI gap; VTON multi-garment; demand insights còn nông | Roadmap, không chặn demo |

**Test (2026-08-25):** Vitest 174, pytest 19, Playwright CI 54 — pass; Maven **169/171** — 2 test try-on assert `COMPLETED` khi job còn `PROCESSING`. Chi tiết mục 9.

**Kết luận:** Không phải hệ thống “thiếu route”. Thiếu chủ yếu là **cứng hóa production** (billing, secret, xóa PII, cô lập VTON) và **backlog GV phase B/C** đã ghi trong implementation notes.

---

## 2. Kiến trúc hiện tại

### 2.1 Production (định hướng đúng)

| Lớp | Chính | Dự phòng |
|-----|--------|----------|
| Frontend | Vercel (Next.js, `BACKEND_INTERNAL_URL` → API) | — |
| Backend | Hetzner VPS + Docker + Caddy TLS | Render (cold) |
| Database | Neon Postgres (một writer) | cùng Neon |
| Media | Cloudflare R2 | cùng bucket |
| Try-on | `ai-vton` trên VPS (`--profile ai`) hoặc Render | — |

Nguồn: `README.md`, `docs/DEPLOY_HETZNER_VPS.md`, `docs/HETZNER_CUTOVER_CHECKLIST.md`.

### 2.2 Local

`docker-compose.local.yml`: frontend, backend, Postgres **5432**, ai-vton **8001**. Backend trong Docker nói với DB qua network nội bộ `postgres:5432`; máy host / DBeaver dùng `localhost:5432`.

Maven test **không** dùng DB app. Testcontainers hoặc fallback container `fitme-test-postgres` **`55432:5432`**. Container này không phục vụ user; tắt được khi không `mvn test`.

### 2.3 Docs lệch (cần chỉnh, không chặn chạy)

| Tài liệu | Vấn đề |
|----------|--------|
| `docs/ARCHITECTURE.md` | Mô hình browser→Next→Spring→Postgres; **thiếu** Vercel / Hetzner / Neon / Render / R2 |
| `docs/LOCAL_AI_DEV.md` | Bảng “mirror Render” còn lấy Render làm tâm; production chính đã là Hetzner |
| `docs/AI_ARCHITECTURE.md` | Mode `local` vs code thực tế `mock` / `api` / `hf` |
| `CAI_THIEN` § spend UI | Vẫn có chỗ nói backlog; code + notes 2026-08-02 đã có `/profile/purchases` |
| `QA_REPORT.md` | Số JUnit 40 / Vitest 26 — lỗi thời |

---

## 3. Ma trận vai trò & cổng

| Vai trò | Cổng UI | API | Ghi chú |
|---------|---------|-----|---------|
| Consumer (ẩn danh + login) | `/`, `/ai/*`, `/try-on/*`, `/discover`, `/wardrobe`, `/saved-outfits`, `/profile/*`, `/pricing` | Nhiều path `permitAll` + session `X-Anonymous-Session` hoặc JWT | MVP anonymous-first |
| Brand owner | `/brand/*` | `/api/v1/brand/**` — `ROLE_BRAND_OWNER` | Billing PayOS |
| Admin | `/admin/*` | `/api/v1/admin/**` — `ROLE_ADMIN` | Middleware JWT + cookie portal |

Frontend middleware kiểm tra JWT (không chỉ cookie role). API brand/admin có `@PreAuthorize`. Consumer dựa **ownership / session**, không phải role.

---

## 4. Luồng nghiệp vụ (end-to-end)

Chú thích: **COMPLETE** = demo được xuyên suốt; **PARTIAL** = chạy được nhưng shortcut MVP; **MISSING** = chưa làm.

| Luồng | Trạng thái | Đường đi chính | Thiếu / rủi ro |
|-------|------------|----------------|----------------|
| Đăng ký / đăng nhập | PARTIAL | `/auth/*` → `AuthController` → `AuthService` | `emailVerified=true` ngay khi register; verify/reset **in-memory + log `[MOCK]`**, không SMTP; token mất khi restart |
| Quên mật khẩu | PARTIAL | UI dán token | Phụ thuộc mock; có `TestAuthController` (tắt mặc định trên prod) |
| Tư vấn AI | COMPLETE | `/ai/start` → body → vibe quiz → `/ai/chat` → `StylistChatController` + Gemini/rule fallback | Route cũ `/ai/options`, `/ai/result` chỉ redirect; Gemini model deprecated sẽ fallback rule (vẫn ra outfit) |
| Try-on ảo | COMPLETE (MVP) | `/try-on` → upload → poll → result → `TryOnController` → `ai-vton` | Multi-garment / wardrobe-AI = backlog; job async có thể còn `PROCESSING` nếu test không poll |
| Discover → SP → mua | COMPLETE | `/discover`, `/products/[id]` → `RedirectController` | Trang FE `/redirect/loading?url=` **không** validate URL (open redirect) |
| Wardrobe + saved outfits | COMPLETE | CRUD + blend vào gợi ý | Chưa classify ảnh AI |
| Chi tiêu / đã mua (B2C) | COMPLETE (MVP) | `/profile/purchases` + confirm sau redirect | Chưa gắn gói Plus; chưa ngân sách/cảnh báo |
| Brand apply → duyệt → SP → analytics | COMPLETE | Onboarding + `BrandDashboardController` | Demand insights còn nhẹ, không job tuần |
| Brand billing PayOS | COMPLETE (mock/live) | `BrandBillingService` + webhook | **Mock mặc định = cấp quota không trả tiền** |
| Admin duyệt brand/SP, gói, rules, partnership, try-on monitor | COMPLETE | Admin UI + controllers | Partnership **không có API xóa**; privacy process = đổi status |
| Free vs FitMe Plus | PARTIAL | `/pricing` toggle entitlement + scoring PREFER/STRICT | **Không PayOS consumer**, không trial 7 ngày |
| Partnership / same-brand scoring | COMPLETE (mềm) | `OutfitScoringService` + badge | STRICT = soft-filter, không khóa catalog |
| Xóa dữ liệu / GDPR-lite | PARTIAL | User gửi request; admin “process” | **`PrivacyService.processDeletion` chỉ set COMPLETED — không xóa ảnh/profile** |

Không thấy luồng portal **gãy scaffolding** (trang trống không gọi API) trừ các shortcut cố ý ở trên.

---

## 5. Đối chiếu góp ý giáo viên & roadmap

### 5.1 Must / Should / Could — `CAI_THIEN_DU_AN_FITME.md`

| Hạng mục | Ưu tiên | Hiện trạng | Ghi chú |
|----------|---------|------------|---------|
| Brand-coherent scoring + partnership | Must A | **Đã làm** | Scoring + admin UI + seed |
| Free mix / Plus ưu tiên brand | Must A | **Một phần** | Entitlement + `/pricing`; chưa thu tiền user |
| Ẩn material consumer | Must A | **Đã làm** | Product detail / AI copy |
| Vibe quiz Gen Z | Must A | **Đã làm** | `/ai/vibe-quiz` |
| Preference từ like/save/redirect | Must A | **Đã làm** | `PreferenceLearningService` |
| Script demo Free↔Plus | Must A | **Đã làm** | Toggle trên `/pricing` |
| Badge cùng brand / partner | Should A | **Đã làm** | `coherenceLabel` |
| PayOS Plus + trial 7 ngày | Must B | **Chưa** | Ghi deferred trong notes |
| UI chi tiêu | Must B | **Đã làm (cơ bản)** | Search + tổng tháng |
| Partnership CRUD | Should B | **Một phần** | Có tạo/list, không xóa |
| Upsell theo preference strength | Should B | **Chưa** | Banner mềm |
| STRICT advanced | Could B | **Một phần** | Override Plus |
| Vibe share / progressive profiling | Should B | **Chưa** | |
| B2B demand dashboard | Must C | **Một phần** | `/brand/insights/demand` nhẹ |
| Capsule / collab campaign | Should C | **Chưa** | |
| Preference offline calibrate | Should C | **Chưa** | |
| Partner graph | Could C | **Chưa** | |
| Full outfit VTON | Could C | **Chưa** | AI_ROADMAP Phase 4 |

### 5.2 `AI_ROADMAP.md`

| Phase | Nội dung | Hiện trạng |
|-------|----------|------------|
| 1 | VTON microservice + poll async | **Đã làm** (`ai-services/vton`, client Java, FE poll) |
| 2 | Embeddings semantic outfit | **Chưa nối** — service + `EmbeddingClient` tồn tại, recommendation **không gọi** |
| 2.5 | Gemini stylist hybrid | **Đã làm** (fallback rule nếu model 404) |
| 3 | Wardrobe AI gap + size confidence từ feedback | **Thiếu / nông** |
| 4 | Multi-garment VTON | **Thiếu** |

---

## 6. Bảo mật

Phân loại: **Confirmed** = có trong code/config. Không kèm PoC.

### 6.1 Nghiêm trọng / cao (xử lý trước khi billing hoặc public PII)

| Mức | Phát hiện | File / hành vi |
|-----|-----------|----------------|
| Critical (misconfig) | `PAYOS_MOCK` mặc định `true` → checkout **cấp quota** không thanh toán | `application.yml`, `BrandBillingService.createCheckout`, `.env.hetzner.example`, `render.yaml` |
| Critical (misconfig) | JWT secret mặc định trong config/compose | `application.yml`, `docker-compose.yml` |
| High | Webhook mock **không verify chữ ký** | `MockPayOsClient` |
| High | Reset/verify email in-memory, token in log | `AuthService` |
| High | Xóa dữ liệu không xóa PII | `PrivacyService.processDeletion` |
| High | `/uploads/**` `permitAll` + cache public | `SecurityConfig`, `UploadResourceController` |
| High | ai-vton **không auth**; fetch URL ảnh (SSRF nếu URL garment/user do attacker) | `ai-services/vton`; `UrlValidator` chỉ chặn `javascript:`/`data:` |
| High | Compose **dev** publish Postgres 5432, API 8080, vton 8001 ra host | `docker-compose.yml` (Hetzner bind `127.0.0.1` — đúng) |

### 6.2 Trung bình

- CSRF tắt toàn cục (API Bearer; portal cookie vẫn tồn tại).
- Access/refresh JWT trong `localStorage` (XSS = mất session).
- Không rate-limit `/auth/login`.
- Open redirect: `frontend` redirect loading nhận `url=` tùy ý.
- Refresh token không rotate khi refresh.
- Register coi email đã verify.
- Mật khẩu tối thiểu 6 ký tự.
- Upload tin `Content-Type`, không magic bytes.
- Consumer Plus tự bật trên `/pricing` (cố ý demo).
- Swagger `permitAll` khi không phải profile prod.
- Seed password `fitme123` trong README / env example.

### 6.3 Đã làm tốt

- Brand/admin API khóa role; portal middleware `jwtVerify`.
- Live PayOS verify webhook; grant `PAID` idempotent.
- `.env` / `.env.hetzner` gitignore; không thấy key Gemini/FASHN trên client (`NEXT_PUBLIC_*`).
- Actuator gần như chỉ `health`; prod ẩn details.
- Ownership check photo/recommendation/redirect.
- Hetzner compose không public 8080/8001 ra internet.
- `FITME_TEST_EXPOSE_RESET_TOKENS` mặc định false, prod ép false.

### 6.4 Ưu tiên vá (khuyến nghị)

1. Profile `prod`: cấm `PAYOS_MOCK=true` (fail-closed); secret JWT bắt buộc, không default.
2. Cô lập ai-vton (network nội bộ + token); allowlist host khi fetch ảnh.
3. Ký URL upload hoặc authz; `processDeletion` xóa file + hàng DB.
4. SMTP thật + persist reset token; rate-limit login.
5. Redirect loading chỉ nhận token server hoặc allowlist http(s).

---

## 7. Vận hành / deploy

| Hạng mục | Hiện trạng |
|----------|------------|
| SSL | Caddy + Let’s Encrypt — **hướng dẫn ops**, không tự chạy trong repo |
| Health | `/actuator/health`; docs gợi ý UptimeRobot |
| Backup Neon / restore drill | **Chưa** có runbook trong repo |
| Xoay JWT_SECRET | **Chưa** runbook (Vercel + VPS + Render phải đổi cùng lúc) |
| Dual-writer Neon | Checklist Hetzner **có** (không chạy nóng VPS + Render) |
| Log | Compose Hetzner `json-file` max-size |
| `FITME_AI_MODE` | Local `mock`; Render docs `hf`; Hetzner example `api` — dễ deploy sai cặp |
| Gemini | `gemini-2.0-flash` trong config — Google có thể 404; app fallback rule |

---

## 8. Cơ cấu repo & kỹ thuật

| Ổn | Lệch |
|----|------|
| Tách `frontend/`, `backend/`, `ai-services/vton`, `docs/`, `deploy/hetzner/` | `.tmp-ui-ux-pro-max-skill` (nếu còn) — rác |
| Flyway V1–V15 (coherence, purchase, override) | `EmbeddingClient` chết (không được gọi) |
| Env examples đầy đủ (local, cloud, hetzner, test) | `frontend-v2` không còn — tốt |
| E2E ~45 spec dưới `frontend/e2e/` | Consumer PayOS / hard-delete / embeddings **không có test** (đúng vì chưa làm) |
| Java 21+ bắt buộc; Windows PATH Java 8 → Maven fail nếu không set `JAVA_HOME` | Ghi trong notes |

---

## 9. Kiểm thử (chạy lại 2026-08-25)

Stack local lúc chạy: frontend `:3000` **200**, backend `/actuator/health` **UP**, ai-vton `:8001` mock **ok**, Postgres app **5432**. Test DB **55432** không bị đổi cổng. Maven dùng JDK 24 (`JAVA_HOME`), không dùng Java 8 trên PATH.

| Lớp | Lệnh | Kết quả |
|-----|------|---------|
| Frontend Vitest | `npx vitest run` | **174 passed**, 0 fail (45 file) |
| Frontend build | `npm run build` | **Pass** (Next.js 16, 64 trang) |
| ai-vton pytest | `python -m pytest -q` | **19 passed**, 0 fail |
| Backend Maven | `mvn -q test` | **169 passed / 171**, **2 fail** |
| Playwright CI subset | smoke + role-flows + rbac + mobile-nav | **54 passed**, 0 fail |

### Maven — 2 test fail (đã xác nhận)

`TryOnPreviewModeIntegrationTest.userPhotoMode_generatesSuccessfully` và `avatarMode_generatesSuccessfully`: kỳ vọng `COMPLETED`, thực tế `PROCESSING` (job async chưa xong trong cửa sổ assert). Testcontainers không gắn Docker (`Could not find a valid Docker environment`) — suite vẫn chạy qua fallback Postgres.

**Sửa đề xuất:** poll đến `COMPLETED` (timeout hợp lý) hoặc bật chế độ đồng bộ trong test profile. Không đụng cổng 5432.

### Không chạy

Full Playwright (`admin-full`, `brand-full`, `try-on`, …) — cố ý; CI subset đã cover smoke + RBAC. Lần QA cũ từng flake `photo-preview` / `saved-outfits` — chưa retest full suite tối nay.

`QA_REPORT.md` (2026-06-24: 40 / 26 / E2E 72) **bỏ** khi báo cáo GV. Notes 2026-08-02 (149 / 168) cũng **lỗi thời** so với bảng trên.

---

## 10. Việc nên làm tiếp (backlog có thứ tự)

### Ngay (trước demo có thanh toán / dữ liệu thật)

1. Tắt mock PayOS trên môi trường billing; fail nếu prod + mock.
2. JWT_SECRET riêng, dài, không commit.
3. Không expose ai-vton ra internet không auth.
4. Không dùng `/uploads` public cho ảnh body nếu chưa signed URL.

### Thesis / Must B (sản phẩm)

5. SMTP + verify email thật (hoặc ghi rõ “demo không gửi mail” trên slide).
6. Hard-delete khi admin duyệt yêu cầu xóa.
7. (Nếu GV hỏi Plus) PayOS consumer hoặc giữ toggle và **nói thẳng là flag demo**.
8. Sửa test try-on poll; giảm flake E2E photo/save.

### Should / Phase C

9. Nối embeddings vào scoring hoặc **xóa/giấu** service chết.
10. Demand insights: aggregate occasion / category gap.
11. Partnership delete/deactivate.
12. Rate-limit login; validate redirect URL phía FE.
13. Cập nhật `ARCHITECTURE.md` + `QA_REPORT` cho khớp Hetzner/Vercel/Neon.

---

## 11. Phụ lục — API surface (rút gọn)

| Prefix | Auth filter |
|--------|-------------|
| `/api/v1/auth`, `/sessions`, `/test` | permitAll |
| `/api/v1/products` GET, `/brands` GET | public |
| `/api/v1/recommendations`, `stylist/chat`, `try-on`, `uploads`, `previews`, `wardrobe`, `me`, `redirects`, `privacy` | permitAll + identity trong service |
| `/api/v1/webhooks/payos` | permitAll (verify chữ ký khi live) |
| `/api/v1/brand/**` | BRAND_OWNER |
| `/api/v1/admin/**` | ADMIN |

---

*Hết báo cáo. Cập nhật file này sau mỗi lần cutover Hetzner hoặc khi bật PayOS live.*
