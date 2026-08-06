# FASHN VTON — Tích hợp FitMe

Contract giữa Spring Boot và microservice `ai-vton`, mapping category, lifecycle async, và checklist self-host.

> **Một API call = một món đồ.** FASHN's hosted API (`api.fashn.ai`) chỉ ghép **một**
> `garment_image` lên **một** `model_image` mỗi lần gọi `/v1/run`
> (xem [tryon-v1.6 docs](https://docs.fashn.ai/api-reference/tryon-v1-6)) — không có
> endpoint nào nhận nhiều món đồ (áo + quần + giày) trong 1 request để ghép "full outfit"
> một lần. FitMe ghép full outfit bằng cách gọi tuần tự: bước 1 ghép áo lên ảnh gốc, bước 2
> ghép quần lên **kết quả của bước 1**, v.v. — xem §1b bên dưới. Điều này áp dụng cho mọi
> provider (`api`/FASHN, `hf`, `local`), không riêng FASHN.

---

## 1. API contract (Spring ↔ ai-vton)

### POST `/v1/try-on`

**Request (1 món đồ — tương thích ngược):**

```json
{
  "person_image_url": "http://localhost:8080/uploads/user-photos/abc.jpg",
  "garment_image_url": "https://cdn.example.com/shirt.jpg",
  "category": "tops",
  "mode": "balanced"
}
```

**Response (202):**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

### 1b. Full outfit — nhiều món đồ (`garments[]`)

Khi try-on có từ 2 món trở lên hỗ trợ VTON (vd. áo + quần), backend gửi tất cả trong
`garments` thay vì `garment_image_url`/`category` đơn lẻ:

```json
{
  "person_image_url": "http://localhost:8080/uploads/user-photos/abc.jpg",
  "mode": "balanced",
  "garments": [
    { "garment_image_url": "https://cdn.example.com/top.jpg", "category": "tops" },
    { "garment_image_url": "https://cdn.example.com/pants.jpg", "category": "bottoms" }
  ]
}
```

`ai-vton` vẫn trả về **một** `job_id` duy nhất. Nội bộ, `app/sequence.py`
(`SequentialVtonRunner`) gọi provider hiện tại (FASHN/HF/local) từng bước một, dùng
output ảnh của bước trước làm `person_image_url` cho bước sau, rồi mới báo `completed`
với ảnh cuối cùng. `GET /v1/try-on/{job_id}` không đổi — Spring Boot poll như bình thường,
không biết (và không cần biết) có bao nhiêu bước bên trong.

`VtonCategoryMapper.selectGarments()` (backend) quyết định thứ tự: `ONE_PIECE` một mình
(đã phủ toàn thân, bỏ qua TOP/BOTTOM) → nếu không, TOP (hoặc OUTERWEAR nếu không có TOP)
rồi đến BOTTOM. Tối đa 2 bước trong MVP hiện tại.

**Progress khi đang chạy nhiều bước:** `GET /v1/try-on/{job_id}` (ai-vton) trả thêm `step`,
`total_steps`, `current_category` khi `status=processing` cho job tuần tự. Backend
(`AiVtonClient.VtonJobResponse` → `VtonTryOnService.getProcessingStepLabel`) map thành
nhãn tiếng Việt ("Đang mặc áo... (1/2)") gắn vào `TryOnResponse.processingStepLabel` —
frontend (`useTryOnPoll`/`TryOnProgressBar`) hiển thị nhãn này thay vì spinner chung chung
khi có sẵn.

### GET `/v1/try-on/{job_id}`

**Response (processing):**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

**Response (completed):**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output_image_url": "https://..."
}
```

**Response (failed):**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error_code": "INVALID_IMAGE",
  "error_message": "Could not detect person"
}
```

### Error codes

| Code | Ý nghĩa | Hành vi FitMe |
|------|---------|---------------|
| `INVALID_IMAGE` | Ảnh person/garment không hợp lệ | Fallback outfit board |
| `UNSUPPORTED_CATEGORY` | Category không VTON | Fallback outfit board |
| `PROVIDER_ERROR` | Lỗi FASHN API/local | Retry 1 lần, sau đó FAILED |
| `RATE_LIMIT` / `OUT_OF_CREDITS` | FASHN 429 (`RateLimitExceeded`/`OutOfCredits`) | FAILED + fallback message "hết quota/credit" |
| `UNAUTHORIZED` | FASHN 401 (`FASHN_API_KEY` sai/thiếu) | FAILED + fallback message "cấu hình API key" |
| `TIMEOUT` | Quá `job-timeout-seconds` (backend) hoặc `VTON_SEQUENCE_STEP_TIMEOUT_SECONDS` (mỗi bước sequential) | FAILED + fallback message |

FASHN runtime errors (`ImageLoadError`, `ContentModerationError`, `InputValidationError`,
...) được map thẳng thành `error_code`/`error_message` từ response `/v1/status/{id}` — xem
[FASHN error handling docs](https://docs.fashn.ai/api-overview/error-handling).

`AiVtonClient` (backend) parse `error_code`/`error_message` từ body lỗi của `ai-vton`
(kể cả response 4xx dạng FastAPI `{"detail": {"error_code": ..., "error_message": ...}}`)
thay vì chỉ dựa vào message ngoại lệ HTTP — xem `AiVtonClient.parseFailureResponse` và
`VtonTryOnService.sanitizeVtonErrorMessage`, map mỗi `error_code` thành toast tiếng Việt
tương ứng ở bảng trên.

---

## 2. Category mapping (FitMe → FASHN)

| ProductCategoryGroups / ItemRole | FASHN category | Phase 1 |
|----------------------------------|----------------|---------|
| Áo (`TOP`) | `tops` | ✅ |
| Áo khoác (`OUTERWEAR`) | `tops` (chỉ dùng khi không có `TOP`) | ✅ |
| Quần (`BOTTOM`) | `bottoms` | ✅ (ghép sau `TOP`/`OUTERWEAR`, tuần tự) |
| Váy, `ONE_PIECE` | `one-pieces` | ✅ (một mình, bỏ qua TOP/BOTTOM) |
| Giày (`SHOES`) | — | ❌ fallback outfit board |
| Phụ kiện (`ACCESSORY`) | — | ❌ fallback outfit board |

Implementation: `VtonCategoryMapper.selectGarments()` — trả về danh sách tối đa 2 món theo
thứ tự gọi (xem §1b). `SHOES`/`ACCESSORY` không được `ai-vton` chấp nhận
(`UNSUPPORTED_CATEGORY`) nên bị lọc ra từ phía backend trước khi gọi — try-on vẫn
`COMPLETED` bằng preview outfit board nếu không còn món nào VTON được.

FASHN's `tryon-max` endpoint (chưa dùng trong MVP này) hỗ trợ thêm `shoes`, `hats`,
`jewelry`, `bags` — có thể mở rộng `VtonCategoryMapper`/`fashn_api.py` sau này nếu cần,
nhưng vẫn là **một món/một call**, không đổi kiến trúc tuần tự ở trên.

---

## 3. Async lifecycle

```
TryOnRequest:  DRAFT → PROCESSING → COMPLETED | FAILED
PreviewGeneration: PENDING → PROCESSING → SUCCEEDED | FAILED
```

1. `generate()` — tạo preview, dispatch job, trả `PROCESSING`.
2. `TryOnJobPoller` — poll `ai-vton` mỗi 3s.
3. `getResult()` — đọc `preview_generations.preview_image_url`, không gọi mock sync.

DB migration `V4__try_on_preview_link.sql`:

- `try_on_requests.preview_generation_id` (FK optional)
- `preview_generations.vton_job_id` (TEXT)

---

## 4. Providers trong ai-vton

| Provider | Env | Mô tả |
|----------|-----|--------|
| `mock` | `AI_MODE=mock` | Placeholder Unsplash, hoàn thành ~1s |
| `api` | `AI_MODE=api` + `FASHN_API_KEY` | **FASHN hosted API** (`https://api.fashn.ai`), model `tryon-v1.6` mặc định (đổi bằng `FASHN_MODEL_NAME=tryon-max` nếu cần 4K/giày/mũ/túi). Đây là gói bạn đã mua tại [app.fashn.ai/api](https://app.fashn.ai/api). |
| `hf` | `AI_MODE=hf` + `HF_TOKEN` (khuyến nghị) | Hugging Face Space [yisol/IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON) qua `gradio_client` |
| `local` | `AI_MODE=local` + CUDA | Wrap fashn-vton-1.5 self-host (tùy chọn) |

Spring Boot: `FITME_AI_MODE=api` (mirror `AI_MODE` của ai-vton), `AI_VTON_URL=http://ai-vton:8001`,
`FITME_PUBLIC_BASE_URL` cho URL ảnh `/uploads`. **`FASHN_API_KEY` chỉ đặt trên service
`ai-vton`** — backend Spring Boot không bao giờ gọi thẳng FASHN, nó luôn gọi qua `ai-vton`.

**Ràng buộc khi dùng `api`:** `api.fashn.ai` phải fetch được `person_image_url` và
`garment_image_url` qua internet công khai. `ai-vton` tự xử lý ảnh `localhost` bằng cách
tải ảnh về và gửi base64 (data URI) cho FASHN thay vì URL — xem
`ai-services/vton/app/local_image_inline.py` và checklist ở `docs/LOCAL_AI_DEV.md`. Không
cần ngrok cho local dev nữa (chỉ cần nếu tắt tính năng này hoặc ảnh > 10MB).

Khi có storage R2 công khai (`FITME_STORAGE_MODE=r2` + `R2_PUBLIC_BASE_URL`), backend gửi
thẳng URL R2 public cho `person_image_url` (`MediaUrlResolver.resolveVtonFetchableUrl`)
thay vì URL proxy qua backend — giảm một chặng fetch và hoạt động kể cả khi backend không
public trực tiếp.

---

## 5. Self-host checklist (production GPU)

- [ ] GPU NVIDIA + CUDA 11.8+
- [ ] Download weights ~2GB vào image hoặc volume
- [ ] Docker profile `gpu`: `Dockerfile.gpu`
- [ ] Cold start 30–90s — warm-up job trước traffic
- [ ] `FITME_PUBLIC_BASE_URL` trỏ URL backend để worker fetch ảnh user
- [ ] Network private giữa backend ↔ GPU worker

---

## 6. Frontend polling

- `try-on/processing`: poll `GET /try-on/requests/{id}` mỗi 2–3s, timeout 120s.
- `FAILED`: hiển thị lỗi + gợi ý xem outfit board nếu có `previewImageUrl` fallback.
