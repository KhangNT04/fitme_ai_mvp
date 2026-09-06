# Implementation notes — cải thiện FitMe (Must pass)

Ngày: 2026-07-24  
Cập nhật: 2026-08-02 (verify + polish pass)

> Kế hoạch sản phẩm / thị trường / roadmap đầy đủ: [`CAI_THIEN_DU_AN_FITME.md`](./CAI_THIEN_DU_AN_FITME.md).  
> File này chỉ ghi **đã ship**, deferred, và cách verify local.

## Gap đã phát hiện (trước Must pass)
Infrastructure (V12, entities, entitlement API, PreferenceLearningService) đã có nhưng **chưa end-to-end** — đã đóng trong Must pass trước đó.

## Đã triển khai

### M1 — Brand-coherent outfits
- Scoring: same-brand / partner bonus + soft penalty theo `OutfitCoherenceMode`; STRICT soft-filter candidates.
- `RecommendationService` build `OutfitScoreContext` từ entitlement + partnership + preference weights.
- Gemini stylist context: `outfitCoherence` + `userAffinity`.
- Response `coherenceLabel`: `"Cùng brand"` | `"Partner look"`; badge trên `ChatOutfitCard`.

### M2 — Bỏ material trên consumer UX
- Ẩn “Chất liệu” trên `/products/[id]`.
- Frontend `AI_DISCLAIMER` khớp backend (không nhắc chất liệu).
- Brand form / admin / DB field giữ optional.

### M3 — Gen Z profile delight
- Flow: body-profile → **vibe-quiz** → chat; stepper `Hồ sơ → Vibe → Tư vấn`.
- `VIBE_QUIZ_OPTIONS` / `BUDGET_BANDS` / `CLOSET_GOAL_OPTIONS` + copy helper trên vibe quiz.

### M4 — Preference flywheel
- Like / Pass trên `ChatOutfitCard` → feedback API → `PreferenceLearningService`.
- Save outfit gọi `applySaveSignal`; redirect vẫn `applyRedirectSignal`.
- Weights + `preferenceScale` feed scoring.

### M5 — Free vs Plus
- `FitMeProperties.Consumer` + `application.yml` (coherence mode + preference scale).
- Free = OFF mix; Plus = PREFER + scale 1.75; upsell banner trên chat.
- **`/pricing` demo toggle** Free ↔ Plus (không cần PayOS); hub link từ `/profile`.
- **STRICT Plus opt-in:** `user_accounts.coherence_mode_override` (Flyway V14); toggle trên `/pricing` khi đang Plus.

### Should / polish (2026-08-02)
- **Tủ chi tiêu:** search brand/sản phẩm + filter “đã mua” + tổng **tháng này** trên `/profile/purchases`.
- **Brand demand:** nav “Nhu cầu Gen Z”; empty states; tỉ lệ like→click / click→xác nhận.
- **Admin partnerships UI:** `/admin/partnerships` (list + tạo cặp brand) + nav admin.

## Verified local (2026-08-02)

| Check | Kết quả |
|-------|---------|
| `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build` | OK — FE :3000, API :8080 healthy, PG :5432 |
| Frontend `npm run lint` | 0 errors (warnings pre-existing) |
| Frontend `npm test` | **168 passed** (43 files); + helpers test sau polish |
| Frontend `npm run build` | OK (gồm `/pricing`, `/admin/partnerships`, …) |
| Backend `mvn test` | **149 passed**, 0 fail (`fitme-test-postgres` bind **55432**, không trùng local PG :5432) |

Lưu ý: Test fallback `fitme-test-postgres` bind **55432** — không trùng `docker-compose.local.yml` Postgres trên **5432**, nên không cần stop local PG trước `mvn test`.

## Deferred
- Full B2C PayOS billing & subscription renewals / trial 7 ngày
- Preference-strength smart paywall (trigger upsell theo affinity score)
- Deeper B2B weekly insight job (occasion / size gap / anonymized chat keywords)
- Vibe share card + progressive profiling
- Illegal/third-party scraping — **không làm**

## Cách verify demo GV
1. Flyway V12–V14; seed partnership K-Style House ↔ Seoul Basic (hoặc tạo trên `/admin/partnerships`).
2. Đăng nhập consumer → `/pricing` → **Thử FitMe Plus** → generate outfit từ product anchor → badge cùng brand / partner.
3. Plus → bật **STRICT** trên `/pricing` → outfit soft-filter mạnh hơn.
4. Free: chuyển về Free → mix brand; like/dislike cập nhật weights.
5. Frontend: body → vibe (budget/closet) → chat; ẩn material; Tủ chi tiêu (search + tháng này); brand `/brand/insights/demand`.
6. Tests nhanh:
   - `mvn -pl backend -Dtest=ConsumerEntitlementServiceTest,OutfitScoringServiceTest test`
   - `npx vitest run src/app/profile/purchases/purchase-helpers.test.ts`
