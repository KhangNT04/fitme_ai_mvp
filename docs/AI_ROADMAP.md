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

## Phase 1 — FASHN VTON hybrid (sprint hiện tại)

**Mục tiêu:** Try-on thật async với fallback mock.

- [x] Microservice `ai-services/vton` (mock, fashn_api, fashn_local)
- [x] Spring: `AiVtonClient`, `VtonCategoryMapper`, async `TryOnService`
- [x] Frontend polling processing → result
- [x] Docker profile `ai`, CI mode `mock`

**Giới hạn MVP:** 1 garment / request; giày & phụ kiện → outfit board.

---

## Phase 2 — Semantic recommendation (sprint hiện tại)

**Mục tiêu:** Cải thiện ranking outfit bằng embedding đa ngôn ngữ.

- [x] Microservice `ai-services/embeddings`
- [x] `SemanticScoringService` + cache `products.style_embedding`
- [x] Hook recompute khi product APPROVED → ACTIVE

**Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (CPU OK cho dev).

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
| Embedding cache hit | > 95% ACTIVE products |
