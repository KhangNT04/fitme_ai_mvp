# FASHN VTON — Tích hợp FitMe

Contract giữa Spring Boot và microservice `ai-vton`, mapping category, lifecycle async, và checklist self-host.

---

## 1. API contract (Spring ↔ ai-vton)

### POST `/v1/try-on`

**Request:**

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
| `TIMEOUT` | Quá `job-timeout-seconds` | FAILED + fallback message |

---

## 2. Category mapping (FitMe → FASHN)

| ProductCategoryGroups / ItemRole | FASHN category | Phase 1 |
|----------------------------------|----------------|---------|
| Áo (`TOP`) | `tops` | ✅ |
| Áo khoác (`OUTERWEAR`) | `tops` | ✅ (outerwear try-on) |
| Quần (`BOTTOM`) | `bottoms` | ✅ |
| Váy, `ONE_PIECE` | `one-pieces` | ✅ |
| Giày (`SHOES`) | — | ❌ fallback outfit board |
| Phụ kiện (`ACCESSORY`) | — | ❌ fallback outfit board |

Implementation: `VtonCategoryMapper` — ưu tiên item `ONE_PIECE` / `TOP`, sau đó `BOTTOM`, `OUTERWEAR` (MVP: **1 sản phẩm / 1 infer**).

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
| `hf` | `AI_MODE=hf` + `HF_TOKEN` (khuyến nghị) | Hugging Face Space [yisol/IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON) qua `gradio_client` |
| `local` | `AI_MODE=local` + CUDA | Wrap fashn-vton-1.5 self-host (tùy chọn) |

Spring Boot: `FITME_AI_MODE=hf`, `AI_VTON_URL=http://ai-vton:8001`, `FITME_PUBLIC_BASE_URL` cho URL ảnh `/uploads`.

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
