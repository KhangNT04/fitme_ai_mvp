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
| `CORS_ORIGINS` | `https://PLACEHOLDER.vercel.app` *(sửa sau bước 3)* |
| `FITME_SEED_ENABLED` | `true` |
| `FITME_SEED_PASSWORD` | `fitme123` |
| `UPLOAD_DIR` | `/tmp/uploads` |

5. **Create Web Service** — đợi build ~5–10 phút.
6. Lấy URL backend, ví dụ: `https://fitme-api.onrender.com`
7. Kiểm tra: mở `https://fitme-api.onrender.com/api/v1/products` → JSON `success: true`.

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
| API trực tiếp | `https://fitme-api.onrender.com/api/v1/products` |
| API qua Vercel proxy | `https://YOUR.vercel.app/api/v1/products` |
| Trang chủ | `https://YOUR.vercel.app` |
| Brand login | `/brand/login` — `brand@fitme.ai` / `fitme123` |

---

## Demo accounts (seed)

Chỉ tạo khi DB Neon **trống** lần đầu backend chạy:

| Email | Vai trò |
|-------|---------|
| admin@fitme.ai | Admin |
| brand@fitme.ai | Brand |
| user@fitme.ai | User |

Mật khẩu: `FITME_SEED_PASSWORD` (mặc định `fitme123`).

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

## Biến môi trường tóm tắt

Xem template: [`.env.cloud.example`](../.env.cloud.example)

| Nơi | Biến quan trọng |
|-----|-----------------|
| Neon | JDBC URL, user, password |
| Render | `DB_*`, `JWT_SECRET`, `CORS_ORIGINS`, `FITME_SEED_*` |
| Vercel | `NEXT_PUBLIC_API_URL=/api/v1`, `BACKEND_INTERNAL_URL` |

---

## Tắt seed trên môi trường shared

Khi không muốn tài khoản demo `fitme123` trên server public:

```
FITME_SEED_ENABLED=false
```

trên Render (sau khi đã tạo tài khoản riêng).
