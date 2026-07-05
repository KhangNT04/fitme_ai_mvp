# FitMe AI — Roadmap

Ma trận ưu tiên và lộ trình 4 phase cho AI trong FitMe.

---

## Ma trận ưu tiên

| Tính năng | Impact | Effort | Phase |
|-----------|--------|--------|-------|
| Virtual try-on (VTON) | Cao | Cao | **1** ✅ sprint này |
| Gợi ý phối đồ semantic | Cao | Trung bình | **2** ✅ sprint này |
| Phân tích tủ đồ (wardrobe AI) | Trung bình | Cao | 3 |
| Size confidence nâng cao | Trung bình | Trung bình | 3 |
| Full outfit VTON (multi-garment) | Cao | Rất cao | 4 |
| Color/form variant VTON | Trung bình | Cao | 4 |

---

## Phase 1 — HF Space VTON (IDM-VTON) + async polling

**Mục tiêu:** Try-on thật async qua Hugging Face Space `yisol/IDM-VTON` với fallback mock/outfit board.

- [x] Microservice `ai-services/vton` (`mock`, `hf`, `local`)
- [x] Spring: `AiVtonClient`, `VtonCategoryMapper`, async `VtonTryOnService` + poller
- [x] Frontend polling processing → result (`useTryOnPoll`)
- [x] Docker profile `ai`

**Phạm vi MVP:** `USER_PHOTO` + remote mode; 1 garment / request; giày & phụ kiện → outfit board.

**Phase 2 semantic** — embeddings service có sẵn; wiring backend chưa hoàn tất (backlog).

---

## Phase 2.5 — Gemini AI Stylist (hybrid) ✅

**Mục tiêu:** Gemini Flash chọn outfit + sinh lời giải thích tiếng Việt từ danh sách sản phẩm eligible (shop có quota AI try-on); fallback rule engine khi API fail.

- [x] `GeminiStylistClient` — REST `generateContent` + JSON schema (Spring `RestClient`)
- [x] `StylistContextBuilder` — body/style/occasion + top-N candidates (mặc định 30)
- [x] `GeminiOutfitValidator` — chỉ chấp nhận `productId` trong candidate set
- [x] Hook `RecommendationService.generate()` — `stylist-mode=gemini` + fallback `rule`
- [x] Config: `FITME_AI_STYLIST_MODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`

**Không đổi contract frontend** — `POST /api/v1/recommendations` + `explanation.*` như cũ.

**Bật local:**

```env
FITME_AI_STYLIST_MODE=gemini
GEMINI_API_KEY=AIza...   # Google AI Studio
GEMINI_MODEL=gemini-2.0-flash
```

Mặc định `stylist-mode=rule` — hành vi rule engine không đổi.

---

## Phase 3 — Wardrobe & size intelligence (backlog)

- Phân loại item tủ đồ từ ảnh (category, màu, form)
- Gợi ý gap analysis ("thiếu áo khoác casual")
- Size confidence từ feedback + body profile history
- Tích hợp wardrobe items vào recommendation pipeline

---

## Phase 4 — Full outfit VTON (backlog)

- Multi-garment sequential try-on (top → bottom → outerwear)
- Variant try-on (màu/size) qua re-infer hoặc latent edit
- Real-time preview trên mobile (WebSocket progress)

---

## Metrics theo dõi

| Metric | Mục tiêu Phase 1–2 |
|--------|---------------------|
| VTON success rate | > 85% (eligible categories) |
| P95 try-on latency | < 45s (API mode) |
| Recommendation CTR | +10% vs rule-only baseline |
| Gemini stylist fallback rate | < 5% (khi API key hợp lệ) |
| Embedding cache hit | > 95% ACTIVE products |
