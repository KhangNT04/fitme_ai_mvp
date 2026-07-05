# Local pre-deploy — test AI trước Vercel/Render

Môi trường **`local`** tách biệt với:

| File / stack | Mục đích |
|--------------|----------|
| `.env` + `docker-compose.yml` | Dev cơ bản (VTON profile `ai` tùy chọn) |
| `.env.test` + `docker-compose.test.yml` | Staging trên VPS/LAN |
| **`.env.local` + `docker-compose.local.yml`** | **Test đầy đủ AI trước khi push production** |

Cấu hình `.env.local` mirror biến Render (`GEMINI_*`, `FITME_AI_*`) để hành vi giống cloud.

---

## Quick start (Docker — khuyến nghị)

### 1. Tạo file env

```powershell
# Windows
copy .env.local.example .env.local
```

```bash
# macOS / Linux
cp .env.local.example .env.local
```

### 2. Điền API keys

Mở `.env.local`:

```env
# Bắt buộc cho Gemini stylist
FITME_AI_STYLIST_MODE=gemini
GEMINI_API_KEY=AIza...          # Google AI Studio

# Tùy chọn — VTON thật qua Hugging Face
FITME_AI_MODE=hf                # hoặc mock (mặc định, nhanh)
HF_TOKEN=hf_xxx                 # huggingface.co/settings/tokens
```

### 3. Chạy stack

```powershell
.\scripts\dev-local.ps1
```

```bash
chmod +x scripts/dev-local.sh
./scripts/dev-local.sh
```

### 4. Mở app

| URL | Mô tả |
|-----|--------|
| http://localhost:3000 | Frontend (giống Vercel) |
| http://localhost:3000/api/v1 | API qua proxy FE |
| http://localhost:8080/actuator/health | Backend health |
| http://localhost:8001/docs | ai-vton OpenAPI |

**Tài khoản demo:** `user@fitme.ai` / `fitme123` (nếu seed bật)

---

## Test từng tính năng AI

### Gemini AI Stylist

1. Đăng nhập hoặc dùng session ẩn danh
2. Cập nhật **body profile** + **style profile**
3. Vào **Bắt đầu tư vấn outfit** (`/ai/*`)
4. Kỳ vọng: title + `explanation.*` tự nhiên (tiếng Việt), latency ~3–8s
5. Nếu Gemini lỗi → fallback rule (vẫn có outfit)

**Log backend:** tìm `Gemini stylist` trong `docker compose ... logs backend`

### Virtual Try-On

| `FITME_AI_MODE` | Hành vi |
|-----------------|---------|
| `mock` | Preview nhanh, không gọi HF |
| `hf` | Gọi `ai-vton` → Space `yisol/IDM-VTON` |

1. Chọn sản phẩm brand có **quota try-on**
2. Upload ảnh toàn thân → **Thử mặc** → chế độ **Ảnh của tôi**
3. Trang processing poll đến `COMPLETED`

**Lưu ý local:** ảnh user lưu tại `backend_local_uploads` volume; URL public `http://localhost:8080/uploads/...` — HF Space **không** fetch được localhost từ internet. VTON `hf` trên máy dev thường cần **ngrok** hoặc test VTON trên Render. Dùng `mock` để test flow UI local.

---

## Hot-reload (không build Docker mỗi lần sửa code)

Chỉ chạy Postgres trong Docker, còn lại native:

```powershell
.\scripts\dev-local.ps1 -Native
```

Rồi mở 3 terminal theo hướng dẫn in ra (backend `mvn spring-boot:run`, frontend `npm run dev`, ai-vton `uvicorn`).

`DB_URL` khi native: `jdbc:postgresql://localhost:5433/fitme` (port từ `POSTGRES_PORT` trong `.env.local`).

---

## Lệnh thường dùng

```powershell
.\scripts\dev-local.ps1          # start
.\scripts\dev-local.ps1 -Logs    # xem log
.\scripts\dev-local.ps1 -Down      # dừng (giữ data volume)
```

```bash
./scripts/dev-local.sh logs
./scripts/dev-local.sh down
```

Xóa DB local và upload:

```bash
docker compose --env-file .env.local -f docker-compose.local.yml down -v
```

---

## So sánh với production

| Biến local (`.env.local`) | Render (`fitme-api`) |
|---------------------------|----------------------|
| `FITME_AI_STYLIST_MODE=gemini` | Cùng tên |
| `GEMINI_API_KEY` | Cùng tên |
| `FITME_AI_MODE=hf` | Cùng tên |
| `AI_VTON_URL=http://ai-vton:8001` | `https://fitme-ai-vton.onrender.com` |
| `FITME_PUBLIC_BASE_URL=http://localhost:8080` | `https://fitme-api.onrender.com` |

Sau khi test local OK → copy **cùng bộ biến AI** sang Render dashboard (đổi URL cho đúng production).

---

## Checklist trước khi push

- [ ] `mvn test` — backend pass
- [ ] `npm test` — frontend pass
- [ ] Flow `/ai/*` với `gemini` — explanation tự nhiên
- [ ] Flow try-on `mock` — processing → completed
- [ ] Không commit `.env.local` (đã trong `.gitignore`)
- [ ] Set env trên Render + redeploy

Chi tiết deploy cloud: [DEPLOY_VERCEL_RENDER_NEON.md](DEPLOY_VERCEL_RENDER_NEON.md)
