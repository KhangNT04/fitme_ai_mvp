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
| `mock` | Preview nhanh, không gọi API/HF nào |
| `api` | Gọi `ai-vton` → **FASHN hosted API** (`https://api.fashn.ai`) — cần `FASHN_API_KEY` |
| `hf` | Gọi `ai-vton` → Space `yisol/IDM-VTON` |

1. Chọn sản phẩm brand có **quota try-on** (chỉ mode **Dùng ảnh cá nhân** gọi VTON thật —
   avatar mẫu/outfit board đang khoá ở frontend)
2. Upload ảnh toàn thân → **Thử mặc** → chế độ **Ảnh của tôi**
3. Chọn cả áo + quần trong outfit để test luồng ghép tuần tự 2 bước (xem
   [FASHN_VTON_INTEGRATION.md](FASHN_VTON_INTEGRATION.md))
4. Trang processing poll đến `COMPLETED`

**Lưu ý local:** ảnh user lưu tại `backend_local_uploads` volume; URL mặc định là
`http://localhost:8080/uploads/...`. `api.fashn.ai` chạy trên internet công khai và không
tự fetch được `localhost` — nhưng **ai-vton tự động xử lý việc này, không cần ngrok**:
`app/local_image_inline.py` tải ảnh `localhost`/`127.0.0.1` **từ chính nó** (ai-vton có
thể gọi thẳng backend — cùng máy khi chạy native, hoặc qua `AI_VTON_INTERNAL_FETCH_BASE_URL=
http://backend:8080` khi chạy Docker Compose, đã set sẵn trong `docker-compose.local.yml`)
rồi gửi FASHN dưới dạng base64 data URI thay vì URL — FASHN's `model_image`/`garment_image`
chấp nhận cả hai (xem [tryon-v1.6 docs](https://docs.fashn.ai/api-reference/tryon-v1-6#input-parameters)).
Chỉ cần set `FASHN_API_KEY` là chạy được thẳng trên `localhost`, không cần tunnel.

HF Space (`AI_MODE=hf`) cũng nhận base64 tương tự qua `gradio_client`, nên cách trên áp
dụng chung cho cả hai provider. Dùng `mock` nếu chỉ muốn test luồng UI mà không gọi AI thật.

Để bật `api` (FASHN) trong `.env.local`:

```env
FITME_AI_MODE=api
FASHN_API_KEY=fa-xxx   # https://app.fashn.ai/api
```

**Vẫn cần ngrok khi nào?** Chỉ khi bạn tắt tính năng trên (`FASHN_INLINE_LOCAL_IMAGES=false`
trên service `ai-vton`) hoặc muốn FASHN tải ảnh trực tiếp thay vì qua ai-vton (ảnh lớn hơn
10MB mặc định `FASHN_INLINE_MAX_BYTES` sẽ tự fallback về URL thô và cần public URL thật).

---

## Hot-reload (không build Docker mỗi lần sửa code)

Chỉ chạy Postgres trong Docker, còn lại native:

```powershell
.\scripts\dev-local.ps1 -Native
```

Rồi mở 3 terminal theo hướng dẫn in ra (backend `mvn spring-boot:run`, frontend `npm run dev`, ai-vton `uvicorn`).

`DB_URL` khi native: `jdbc:postgresql://localhost:5432/fitme` (port từ `POSTGRES_PORT` trong `.env.local`).

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
| `FITME_PUBLIC_BASE_URL=http://localhost:8080` | `https://fitme-ai-mvp.onrender.com` |

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
