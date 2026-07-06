# Deploy FitMe AI — Free cloud (Vercel + Render + Neon)

Hướng dẫn deploy **0 đồng** với link public dạng `https://xxx.vercel.app`.

```
Người dùng → Vercel (Next.js)
                ├─ pages: SSR/static
                └─ /api/v1/* → rewrite → Render (Spring Boot)
                                              └─ Neon (PostgreSQL)
```

Frontend gọi **`/api/v1`** (same-origin trên Vercel), Next.js proxy sang Render — tránh lỗi CORS phức tạp trên browser.

---

## Yêu cầu

- Tài khoản GitHub (repo: [fitme_ai_mvp](https://github.com/KhangNT04/fitme_ai_mvp))
- Email đăng ký miễn phí: [Neon](https://neon.tech), [Render](https://render.com), [Vercel](https://vercel.com)

**Lưu ý free tier Render:** service **ngủ** sau ~15 phút không truy cập; lần mở đầu **chậm 30–60 giây**. Upload file trên Render **không lưu lâu dài** (disk tạm) — MVP test vẫn ổn.

**Ảnh sản phẩm (MVP):** Brand nhập **URL ảnh** (gallery nhiều URL), không upload file SP lên cloud. Ảnh user/wardrobe upload trên Render là **ephemeral** (`UPLOAD_DIR=/tmp/uploads`) — phù hợp preview thử nghiệm, không dùng làm CDN lâu dài.

---

## Bước 1 — Neon (PostgreSQL)

1. Đăng ký [neon.tech](https://neon.tech) → **New Project** (region gần VN: `Singapore` / `AWS ap-southeast-1`).
2. Tạo database tên `fitme` (hoặc dùng `neondb` mặc định).
3. Tab **Connection details** → chọn **Direct connection** (không dùng pooled cho Flyway lần đầu).
4. Copy thông tin:

| Biến | Ví dụ |
|------|--------|
| Host | `ep-xxx.ap-southeast-1.aws.neon.tech` |
| Database | `neondb` |
| User / Password | từ Neon dashboard |

5. **JDBC URL** cho Render (bắt buộc `sslmode=require`):

```
jdbc:postgresql://ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Giữ `DB_USERNAME` và `DB_PASSWORD` riêng (không nhét vào URL).

---

## Bước 2 — Render (Backend Java)

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect GitHub repo `fitme_ai_mvp`.
3. Cấu hình:

| Field | Value |
|-------|--------|
| Name | `fitme-api` |
| Region | Singapore |
| Branch | `main` |
| Root Directory | *(để trống)* |
| Runtime | **Docker** |
| Dockerfile Path | `backend/Dockerfile` |
| Docker Context | `backend` |
| Instance Type | **Free** |

4. **Environment Variables:**

| Key | Value |
|-----|--------|
| `DB_URL` | JDBC Neon ở trên |
| `DB_USERNAME` | user Neon |
| `DB_PASSWORD` | password Neon |
| `JWT_SECRET` | chuỗi random ≥32 ký tự |
| `SPRING_PROFILES_ACTIVE` | `prod` *(tắt Swagger, seed mặc định off trong profile)* |
| `CORS_ORIGINS` | `https://PLACEHOLDER.vercel.app` *(sửa sau bước 3)* |
| `FITME_SEED_ENABLED` | `false` *(prod; không tạo user mới)* |
| `FITME_SEED_FASHION_REFRESH` | `true` *(mặc định prod — đồng bộ catalog thời trang khi backend khởi động)* |
| `FITME_SEED_PASSWORD` | chỉ khi bật seed — dùng mật khẩu mạnh |
| `UPLOAD_DIR` | `/tmp/uploads` |
| `PAYOS_MOCK` | `true` *(test billing trên cloud không cần key; đổi `false` khi có PayOS)* |
| `PAYOS_RETURN_URL` | `https://fitme-ai-mvp.vercel.app/brand/billing/return?status=success` |
| `PAYOS_CANCEL_URL` | `https://fitme-ai-mvp.vercel.app/brand/billing/return?status=cancel` |
| `PAYOS_CLIENT_ID` | *(chỉ khi `PAYOS_MOCK=false`)* |
| `PAYOS_API_KEY` | *(chỉ khi `PAYOS_MOCK=false`)* |
| `PAYOS_CHECKSUM_KEY` | *(chỉ khi `PAYOS_MOCK=false`)* |
| `FITME_AI_STYLIST_MODE` | `gemini` *(production; `rule` chỉ khi tắt Gemini)* |
| `GEMINI_API_KEY` | API key từ [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-2.0-flash` *(tùy chọn)* |
| `GEMINI_TIMEOUT_MS` | `25000` *(khuyến nghị trên Render)* |
| `FITME_AI_MODE` | `hf` *(gọi ai-vton; `mock` chỉ dev local)* |
| `AI_VTON_URL` | `https://fitme-ai-vton.onrender.com` |
| `FITME_PUBLIC_BASE_URL` | URL backend Render (vd. `https://fitme-api.onrender.com`) |
| `FITME_STORAGE_MODE` | `r2` *(production VTON; `local` chỉ dev)* |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | `fitme-uploads` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API token |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API secret |
| `R2_PUBLIC_BASE_URL` | Public bucket URL (vd. `https://pub-xxxx.r2.dev`) |

**Cloudflare R2 (bắt buộc cho try-on USER_PHOTO trên Render):**

1. Cloudflare Dashboard → R2 → tạo bucket `fitme-uploads`
2. Bật public access hoặc custom domain → lấy `R2_PUBLIC_BASE_URL`
3. Tạo S3-compatible API token → set `R2_*` trên Render
4. Set `FITME_STORAGE_MODE=r2` → redeploy backend

**Manual E2E checklist (Vercel + Render):**

| Kiểm tra | Kỳ vọng |
|----------|---------|
| AI Stylist | Title tự nhiên (không còn template "phong cách đa dạng"), 2–3 item, badge **AI Gemini** |
| `/actuator/health` | `geminiConfigured: true` khi đã set key |
| Try-on USER_PHOTO | Badge **Ảnh thử mặc AI** khi VTON thành công; ảnh khác catalog |
| VTON fallback | Badge **Minh họa sản phẩm** + `errorMessage` hiển thị |
| Màu trên result | Khớp `selectedColor` của item đang thử |

**PayOS webhook** (khi dùng thanh toán thật):

1. Trên Render dashboard, set `PAYOS_MOCK=false` và 3 key từ [my.payos.vn](https://my.payos.vn) (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`) — **phải cùng kênh thanh toán** đang cấu hình webhook.
2. **Manual Deploy** để backend nhận env mới.
3. Đăng ký webhook URL:

```
https://fitme-api.onrender.com/api/v1/webhooks/payos
```

*(Thay `fitme-api` bằng URL Render thực tế nếu khác.)*

**Render FREE — tránh lỗi `timeout of 10000ms exceeded`:**

PayOS chỉ chờ ~10 giây; service free **ngủ** sau ~15 phút và cold start Docker/Spring thường **30–60 giây**.

| Bước | Việc cần làm |
|------|----------------|
| 1 | Mở `https://fitme-api.onrender.com/actuator/health` — đợi `{"status":"UP"}` |
| 2 | Trong **1–2 phút**, vào my.payos.vn → dán webhook URL → **Lưu** |
| 3 | Không để tab PayOS idle lâu rồi mới bấm Lưu (service có thể ngủ lại) |

**Lỗi khác timeout:** nếu server đã UP nhưng PayOS vẫn báo webhook lỗi, kiểm tra `PAYOS_MOCK=false` và checksum key khớp dashboard. Backend trả **2XX** khi nhận payload (kể cả order mẫu `orderCode: 123` của PayOS).

**Giữ service ấm (tùy chọn):** [UptimeRobot](https://uptimerobot.com) ping `/actuator/health` mỗi 5 phút. **Lâu dài:** nâng Render Starter nếu cần webhook thanh toán ổn định.

5. **Create Web Service** — đợi build ~5–10 phút.
6. Lấy URL backend, ví dụ: `https://fitme-api.onrender.com`
7. Kiểm tra health: `https://fitme-api.onrender.com/actuator/health` → `{"status":"UP"}`
8. Kiểm tra API: `https://fitme-api.onrender.com/api/v1/products` → JSON `success: true`.

**Blueprint (tùy chọn):** repo có `render.yaml` → Render → **New Blueprint** → connect repo.

---

## Bước 3 — Vercel (Frontend Next.js)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `fitme_ai_mvp`.
2. Cấu hình:

| Field | Value |
|-------|--------|
| Framework Preset | Next.js |
| **Root Directory** | `frontend` |
| Build Command | *(default `next build`)* |
| Output | *(default)* |

3. **Environment Variables** (Production):

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `/api/v1` |
| `BACKEND_INTERNAL_URL` | `https://fitme-api.onrender.com` *(URL Render, không slash cuối)* |
| `JWT_SECRET` | **cùng giá trị với Render** *(portal middleware verify JWT; không dùng `NEXT_PUBLIC_`)* |

4. **Deploy** → nhận URL ví dụ `https://fitme-ai-mvp.vercel.app`.

5. Quay lại **Render** → sửa `CORS_ORIGINS` = URL Vercel chính xác:

```
https://fitme-ai-mvp.vercel.app
```

*(Khớp scheme + domain; không slash cuối.)* → Save → Render tự redeploy.

6. Mở Vercel URL → thử **Bắt đầu tư vấn outfit**.

---

## Kiểm tra sau deploy

| Check | URL / cách |
|-------|------------|
| Backend health | `https://fitme-api.onrender.com/actuator/health` |
| API trực tiếp | `https://fitme-api.onrender.com/api/v1/products` |
| API qua Vercel proxy | `https://YOUR.vercel.app/api/v1/products` |
| Trang chủ | `https://YOUR.vercel.app` |
| Brand billing | `https://fitme-ai-mvp.vercel.app/brand/billing` |
| Admin gói brand | `https://fitme-ai-mvp.vercel.app/admin/billing/plans` |
| Brand login | `/brand/login` — chỉ khi `FITME_SEED_ENABLED=true` và DB đã seed |

---

## Demo accounts (seed)

Chỉ tạo khi `FITME_SEED_ENABLED=true` **và** DB Neon **trống** lần đầu backend chạy (mặc định prod profile: seed **tắt**):

| Email | Vai trò |
|-------|---------|
| admin@fitme.ai | Admin |
| brand@fitme.ai | Brand |
| user@fitme.ai | User |

Mật khẩu: `FITME_SEED_PASSWORD` (nếu bật seed).

### Bật lại seed demo

Trên **Render** dashboard:

```
FITME_SEED_ENABLED=true
FITME_SEED_PASSWORD=<mật-khẩu-mạnh>
```

Save → redeploy. Tài khoản chỉ được tạo khi DB chưa có user seed (hoặc theo logic top-up trong `SeedDataLoader`).

Để tắt lại: `FITME_SEED_ENABLED=false` (khuyến nghị cho môi trường shared sau khi đã tạo tài khoản thật).

### Catalog thời trang trên DB đã có dữ liệu cũ

Nếu trang **Khám phá** vẫn hiện `Sản phẩm demo 1 - Áo sơ mi` và ảnh phong cảnh Unsplash (seed cũ), backend sẽ **tự sửa** khi:

- `FITME_SEED_FASHION_REFRESH=true` (mặc định trong `application-prod.yml` và `render.yaml`)
- Backend redeploy / restart

Logic: cập nhật sản phẩm tại chỗ thành catalog `fashion-catalog.json` v4 (36 sản phẩm, 3 thương hiệu) với ảnh `/catalog/products/*.jpg` phục vụ từ Vercel. Không cần bật `FITME_SEED_ENABLED=true` hay xóa DB Neon.

Sau khi deploy xong, kiểm tra log Render có dòng `Refreshing fashion catalog for brand K-Style House` và API `/api/v1/products` trả tên sản phẩm thời trang (ví dụ `Áo thun cotton oversize`).

---

## Cập nhật code sau này

- **Push `main`** → Vercel tự deploy frontend.
- Render: bật **Auto-Deploy** → push `main` rebuild backend.
- Neon: schema qua Flyway khi backend khởi động (migration trong repo).

---

## Xử lý lỗi thường gặp

### Trang Vercel load nhưng API lỗi / 502

- Render đang **sleep** — đợi ~1 phút, refresh.
- `BACKEND_INTERNAL_URL` sai — phải là URL Render **không** có `/api/v1`.
- Redeploy Vercel sau khi sửa env.

### CORS error trên browser

- `CORS_ORIGINS` trên Render phải **khớp** URL Vercel (https, không slash cuối).
- Hoặc dùng proxy `/api/v1` (đã cấu hình) — gọi API qua cùng domain Vercel.

### Backend crash — database

- `DB_URL` thiếu `?sslmode=require` với Neon.
- Sai user/password hoặc database name.

### Flyway migration fail

- Dùng Neon **direct** connection string, không phải `-pooler`.
- Xóa DB trên Neon và tạo lại nếu migration state hỏng (chỉ test).

### Upload ảnh không lưu

- Render free: disk **ephemeral** — chấp nhận cho demo; production cần S3/R2.

---

## So sánh với Docker local/VPS

| | Vercel+Render+Neon | Docker VPS |
|---|-------------------|------------|
| Chi phí | Free | Free (Oracle) |
| Link public | Có ngay | Cần IP + port |
| Backend sleep | Có (Render free) | Không |
| Upload file | Tạm | Volume ổn định |
| Độ phức tạp | 3 dashboard | 1 VPS + SSH |

---

## Troubleshooting try-on (USER_PHOTO & AVATAR)

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| Preview ảnh **icon hỏng** trên `/try-on/input` sau F5 | URL `blob:` hết hạn trong localStorage | Đã fix: không persist `photoPreviewUrl`; reload sẽ gọi lại `/uploads/.../quality` |
| Result USER_PHOTO = **ảnh gốc**, không thử mặc | VTON fail hoàn toàn (kể cả composite) | Bật `HF_FALLBACK_COMPOSITE=true` trên ai-vton; kiểm tra `VTON_PUBLIC_BASE_URL` |
| VTON log `gradio` / upstream exception | HF Space `yisol/IDM-VTON` không ổn định | Tự động ghép minh họa (composite); duplicate Space riêng + `HF_TOKEN` để có VTON thật |
| VTON log `person_url_unreachable` | R2 public URL 404 hoặc `/uploads/**` không truy cập | VTON dùng URL backend `FITME_PUBLIC_BASE_URL/uploads/...`; kiểm tra `curl` → 200 |
| Avatar result **không đổi** outfit | VTON fail hoặc chưa deploy bản mới | Avatar cũng đi VTON async; kiểm tra disclaimer composite vs VTON thật |
| Processing **timeout** 120s | Render/ai-vton free tier cold start | Đợi warm-up; ping `/actuator/health` trước khi test |

**Checklist env Render (USER_PHOTO VTON):**

| Biến | Bắt buộc |
|------|----------|
| `FITME_PUBLIC_BASE_URL` | URL backend Render (vd. `https://fitme-ai-mvp.onrender.com`) |
| `FITME_FRONTEND_BASE_URL` | URL Vercel (vd. `https://fitme-ai-mvp.vercel.app`) — cho ảnh catalog |
| `FITME_STORAGE_MODE` | `r2` |
| `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Có |
| `FITME_AI_MODE` | `hf` |
| `AI_VTON_URL` | `https://fitme-ai-vton.onrender.com` |

**Checklist env Render (ai-vton service):**

| Biến | Bắt buộc |
|------|----------|
| `AI_MODE` | `hf` |
| `HF_TOKEN` | Khuyến nghị |
| `HF_FALLBACK_COMPOSITE` | `true` |
| `VTON_PUBLIC_BASE_URL` | `https://fitme-ai-vton.onrender.com` |

**Vercel:** `BACKEND_INTERNAL_URL` phải trùng URL Render để proxy `/api/v1` và `/uploads`.

---

## Biến môi trường tóm tắt

Xem template: [`.env.cloud.example`](../.env.cloud.example)

| Nơi | Biến quan trọng |
|-----|-----------------|
| Neon | JDBC URL, user, password |
| Render | `SPRING_PROFILES_ACTIVE=prod`, `DB_*`, `JWT_SECRET`, `CORS_ORIGINS`, `FITME_SEED_*`, `FITME_AI_STYLIST_MODE`, `GEMINI_API_KEY` |
| Vercel | `NEXT_PUBLIC_API_URL=/api/v1`, `BACKEND_INTERNAL_URL`, **`JWT_SECRET` (cùng Render)** |

---

## Sau khi merge bản cập nhật bảo mật

1. **Render:** thêm `SPRING_PROFILES_ACTIVE=prod`; health check → `/actuator/health`; `FITME_SEED_ENABLED=false` (hoặc bật seed theo mục trên).
2. **Vercel:** thêm `JWT_SECRET` trùng Render → **Redeploy**.
3. Kiểm tra portal: login brand/admin — cookie `fitme-access` httpOnly; không thể vào dashboard chỉ bằng cách sửa cookie `fitme-role` thủ công.
