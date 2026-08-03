# Cải thiện dự án FitMe AI — Kế hoạch theo góp ý giáo viên

> Tài liệu định hướng sản phẩm & lộ trình cải thiện cho MVP FitMe, tập trung thị trường **Gen Z Việt Nam**.  
> Ngày cập nhật: 2026-08-02  
> Ghi chú kỹ thuật đã ship: [`IMPLEMENTATION_NOTES_CAI_THIEN.md`](./IMPLEMENTATION_NOTES_CAI_THIEN.md)

---

## 1. Tóm tắt góp ý giáo viên & định hướng chiến lược

### 1.1 Góp ý gốc (tóm tắt)

| # | Góp ý GV | Ý chính |
|---|----------|---------|
| 1 | Tập trung Gen Z | Định vị thị trường hẹp, UX/copy/giọng điệu Gen Z VN |
| 2 | Phối đồ cùng 1 brand (hoặc brand liên kết) | Coherence brand là khác biệt sản phẩm |
| 3 | (Option) Free phối lung tung; Paid đồng bộ brand | Phân tầng Free / Plus rõ ràng |
| 4 | Mix đồ cá nhân hóa dần theo lựa chọn KH | Preference learning từ hành vi |
| 5 | Sau vận hành: cào/thu thập dữ liệu để tối ưu | Data flywheel first-party |
| 6 | Cá nhân hóa → đề xuất → cá nhân hóa → upsell trả phí | Vòng lặp convert Free → Plus |
| 7 | Bỏ vật liệu | Giảm friction & nhiễu tư vấn |
| 8 | B2B: nắm nhu cầu người dùng | Insights cho brand partner |
| 9 | B2C: quản lý chi tiêu / tra cứu nơi mua lại | Purchase memory & spend tracker |
| 10 | UX khiến KH thích điền thông tin FitMe | Onboarding vui, vibe-first |

### 1.2 Định hướng chiến lược FitMe

1. **Gen Z-first:** FitMe không cố “thời trang cho mọi người” — ưu tiên sinh viên / người đi làm sớm 18–27, mua sắm mobile-first, ngân sách trung bình–thấp, thích vibe hơn “phân tích kỹ thuật”.
2. **Outfit có chủ đích brand:** Paid = cùng brand / brand đối tác; Free = khám phá mix nhiều brand (vẫn hữu ích, nhưng kém “đồng bộ look”).
3. **Cá nhân hóa là động cơ monetization:** càng dùng càng “hiểu mình” → càng muốn giữ Plus (không chỉ bán try-on).
4. **Dữ liệu first-party, không scrape bất hợp pháp:** thu từ hành vi in-app, redirect mua, feedback, wardrobe; B2B nhận báo cáo tổng hợp (anonymized).
5. **Đơn giản hóa bề mặt tư vấn:** bỏ chất liệu khỏi consumer UX; ưu tiên vibe, dáng, ngân sách, occasion.

---

## 2. Phân tích thị trường Gen Z Việt Nam

### 2.1 Bối cảnh

- Gen Z VN mua thời trang qua **Shopee / TikTok Shop / Instagram**, ít trung thành một brand nếu giá & vibe không khớp.
- Quyết định mua nhanh, chịu ảnh hưởng **short video, KOL/KOC, “lookbook”**, sợ mua về không hợp dáng / không phối được với đồ đang có.
- Ngân sách phân mảnh: nhiều mon mua nhỏ thay vì 1 bộ đắt; hay **mua lại** item đã thích nếu sale.
- Nhạy cảm với form dài, formal; thích quiz / chip / kết quả “aesthetic” hơn bảng số đo y khoa.

### 2.2 Pain points → cơ hội FitMe

| Pain point Gen Z | Cơ hội FitMe |
|------------------|--------------|
| Không biết phối đồ với món đang định mua | Stylist chat + outfit từ product anchor / wardrobe |
| Sợ không hợp dáng / tone da | Body + vibe profile nhẹ + try-on / outfit board |
| Catalog quá nhiều brand → rối | Plus: look cùng brand / partner → “clean girl / office siren” đồng bộ |
| Mua rồi quên đã mua ở đâu / hết bao nhiêu | B2C: lịch sử click-mua + ước tính chi tiêu thời trang |
| Điền form dài chán | Vibe quiz, chips, progressive profiling |
| Brand không biết Gen Z thật sự thích gì | B2B: demand insights từ feedback / redirect / affinity |

### 2.3 Insight cạnh tranh (định vị)

| Đối thủ gần | Điểm yếu với Gen Z VN | FitMe khác biệt |
|-------------|----------------------|-----------------|
| Filter try-on / app AR chung | Ít tư vấn outfit + mua thật | Tư vấn → outfit → redirect mua |
| Lookbook Instagram / TikTok | Không cá nhân hóa theo dáng & tủ đồ | Profile + preference weights |
| Brand app riêng | Chỉ 1 brand | Marketplace đa brand + **coherence có kiểm soát** theo gói |
| ChatGPT “phối đồ giúp” | Không catalog / stock / link mua | Catalog eligible + buy-click có track |

**Positioning một câu:** *FitMe là stylist Gen Z VN — đề xuất outfit thật có thể mua, càng dùng càng hiểu vibe bạn, Plus thì look đồng bộ brand.*

---

## 3. Định vị sản phẩm (Gen Z-first, Free vs Paid)

### 3.1 Persona chính

- **Linh, 21, SV năm 3:** mua Shopee 2–4 lần/tháng, thích clean / soft girl, sợ “lủng củng” khi mix brand lạ.
- **Minh, 25, fresher:** cần đồ đi làm + weekend, ngân sách rõ, muốn “capsule” cùng 1–2 brand.

### 3.2 Ma trận Free vs FitMe Plus

| Khía cạnh | FitMe Free | FitMe Plus |
|-----------|------------|------------|
| Phối brand | Mix nhiều brand (khám phá) | Ưu tiên **cùng brand / brand đối tác** (`PREFER`; sau này `STRICT`) |
| Cá nhân hóa | Weights cơ bản (like / dislike / click) | Weights sâu hơn + ưu tiên affinity brand đã thích |
| Try-on / quota AI | Giới hạn mềm (theo policy) | Ưu tiên / quota cao hơn (gắn billing sau) |
| Lịch sử mua / chi tiêu | Bản rút gọn | Full tracker + “mua lại nơi cũ” |
| Stylist tone | Hữu ích, có soft upsell | “Stylist riêng” — ít interrupt upsell |
| Mục tiêu kinh doanh | Activation + habit | Retention + ARPU |

**Nguyên tắc option GV:** Free không “xấu” — Free **cố ý đa dạng brand** để user thấy giá trị khám phá; khi muốn look “đồng bộ / cao cấp hơn” thì nâng Plus.

### 3.3 Mapping entitlement hiện tại (code)

| Thành phần | Trạng thái |
|------------|------------|
| `ConsumerPlan.FREE` / `PLUS` | Đã có (`user_accounts.consumer_plan`) |
| `OutfitCoherenceMode.OFF` / `PREFER` / `STRICT` | Đã có; Free→OFF, Plus→PREFER; STRICT chưa bật cứng |
| `BrandPartnership` graph | Đã có (seed ví dụ K-Style House ↔ Seoul Basic) |
| `PreferenceLearningService` | Đã có (styles / brands / colors) |
| Upsell UI (`PlusUpsellBanner`, `/pricing`) | Đã có (stub) |
| PayOS consumer subscription | **Chưa** (PayOS hiện phục vụ brand billing) |

---

## 4. Các trụ cột cải thiện

Mỗi trụ cột: góp ý GV → đề xuất sản phẩm → trạng thái codebase → bước tiếp.

### 4.1 Brand coherence & partnership outfit scoring

| | |
|--|--|
| **Góp ý** | Phối đồ cùng 1 brand trước, hoặc brand có liên kết |
| **Đề xuất** | Scoring bonus cùng `brandId`; bonus phụ nếu thuộc `brand_partnerships`; Gemini stylist nhận `outfitCoherence` |
| **Hiện trạng** | `OutfitScoringService` + `OutfitScoreContext` + `BrandPartnershipService` — soft bonus/penalty theo mode |
| **Gap** | Admin UI quản lý partnership còn mỏng; STRICT chưa filter cứng; chưa hiển thị badge “Cùng brand / Partner look” trên card outfit |
| **Mở rộng thông minh** | “Capsule week”: 7 ngày look cùng 1 brand partner; collab drop (2 brand liên kết) được boost có thời hạn |

### 4.2 Free = mix brands; Paid = same / partner brand

| | |
|--|--|
| **Góp ý** | Option: Free phối lung tung; trả phí thì đồng bộ |
| **Đề xuất** | Entitlement resolve coherence mode; copy upsell rõ lợi ích “look đồng bộ” |
| **Hiện trạng** | `ConsumerEntitlementService` + API `/api/v1/me/entitlement`; demo toggle không cần PayOS |
| **Gap** | Chưa thanh toán consumer thật; chưa trial 7 ngày Plus; chưa A/B copy upsell |
| **Mở rộng** | Soft-gate: Free thấy preview “Plus look” mờ + CTA; không block cứng quá sớm (giữ habit) |

### 4.3 Personalization loop (feedback → recommend → paywall)

```
Profile/Vibe → Recommend outfit → Like/Dislike/Save/Buy-click
        ↑______________ Preference weights ______________|
                              ↓
                    Upsell khi affinity ổn định
                    (“FitMe đã hiểu vibe bạn — mở Plus để look đồng bộ brand”)
```

| | |
|--|--|
| **Góp ý** | Cá nhân hóa dần; vòng cá nhân hóa → đề xuất → trả phí |
| **Đề xuất** | Signal: like/dislike, save outfit, buy-click redirect; weights feed scoring + stylist |
| **Hiện trạng** | `PreferenceLearningService` + UI like/dislike trên `ChatOutfitCard`; redirect gọi `applyRedirectSignal` |
| **Gap** | Chưa có “preference strength” score để trigger upsell đúng lúc; chưa giải thích “vì sao đề xuất món này” dựa trên weights; anonymous→login merge weights còn cần kiểm chứng E2E |
| **Mở rộng** | Weekly “Your vibe report” (Gen Z shareable): top màu / brand / style — CTA Plus |

### 4.4 Data flywheel sau vận hành

| | |
|--|--|
| **Góp ý** | Sau vận hành, thu thập dữ liệu để tối ưu cá nhân hóa |
| **Đề xuất** | First-party events: session, recommendation, feedback, redirect, try-on outcome; batch job tinh chỉnh weights / cold-start brand |
| **Hiện trạng** | Analytics events + preference weights JSONB; BuyClickEvent |
| **Gap** | Chưa dashboard nội bộ “flywheel health”; chưa retrain / calibrate định kỳ; **không** làm illegal third-party scraping |
| **Thay scraping bất hợp pháp** | (1) Brand tự sync catalog CSV/API; (2) Partner feed; (3) User-contributed wardrobe ảnh; (4) Public price chỉ khi có thỏa thuận |

### 4.5 Bỏ vật liệu (material)

| | |
|--|--|
| **Góp ý** | Bỏ vật liệu |
| **Đề xuất** | Consumer không thấy / không bị hỏi chất liệu trong tư vấn; stylist disclaimer không nhắc material |
| **Hiện trạng** | Đã ẩn trên trang chi tiết consumer; brand form vẫn optional; admin detail vẫn có thể xem |
| **Gap** | Field vẫn tồn tại DB/API (`Product.material`, wardrobe DTO) — chấp nhận được; cần rà soát copy AI còn sót “chất liệu” |
| **Lý do giữ backend field** | Brand có thể dùng nội bộ / filter sau; không đưa vào consumer decision path |

### 4.6 B2B — nắm nhu cầu người dùng (insights)

| | |
|--|--|
| **Góp ý** | B2B cào/thu thập thông tin người ta mong muốn |
| **Đề xuất** | Brand portal: “Nhu cầu Gen Z tuần này” — top occasion, vibe, màu, size gap, sản phẩm được like nhưng chưa click mua, từ khóa chat (anonymized) |
| **Hiện trạng** | Brand billing/quota đã có; analytics track một phần; **chưa** có demand-insight report sâu |
| **Gap** | Aggregation API + UI brand; privacy policy / consent rõ; không bán PII |
| **Mở rộng** | “Restock alert” dựa trên like cao + stock thấp; gợi ý collab partner brand từ graph + affinity chồng chéo |

### 4.7 B2C — chi tiêu & tra cứu mua sắm

| | |
|--|--|
| **Góp ý** | Quản lý số tiền đã chi cho quần áo; tra cứu nơi mua lại sản phẩm trước |
| **Đề xuất** | “Tủ chi tiêu FitMe”: lịch sử buy-click (brand, giá ước tính, URL, ngày); filter “mua lại”; optional tự khai báo đã mua thật |
| **Hiện trạng** | `BuyClickEvent` + redirect confirm — đủ nền tảng; **chưa** có consumer UI spend history |
| **Gap** | API aggregate theo user; trang `/me/purchases` hoặc trong wardrobe; giá có thể thiếu nếu catalog không có price đồng nhất |
| **Mở rộng** | Ngân sách tháng Gen Z (“còn 350k cho outfit đi chơi”); nhắc sale brand đã click; export CSV đồ án demo |

### 4.8 UX onboarding khiến KH thích điền thông tin

| | |
|--|--|
| **Góp ý** | Thêm thông tin giúp KH thích thú điền FitMe |
| **Đề xuất** | Flow vibe-first: ít số đo → quiz aesthetic → kết quả “aesthetic card” → chat |
| **Hiện trạng** | `/ai/body-profile` → `/ai/vibe-quiz` → `/ai/chat`; copy Gen Z; chips vibe / budget / closet goals; stepper Hồ sơ → Vibe → Tư vấn |
| **Gap** | Chưa có share card “Your FitMe vibe”; chưa micro-animation / progress delight đủ mạnh; progressive profiling sau 3–5 session (hỏi thêm 1 câu mỗi lần) |
| **Mở rộng** | Mood theo occasion nhanh (“đi học / đi chơi / đi làm”); ảnh tủ đồ thay vì form; dual tone UI (fun nhưng không childish) |

### 4.9 Bảng tổng hợp map góp ý → trạng thái

| Góp ý GV | Trụ cột | Trạng thái MVP |
|----------|---------|----------------|
| Tập trung Gen Z | §3, §4.8 | Đang làm / đã có vibe flow |
| Cùng brand / partner | §4.1 | Đã ship soft scoring |
| Free mix / Paid đồng bộ | §4.2 | Đã ship entitlement stub |
| Cá nhân hóa dần | §4.3 | Đã ship lightweight |
| Data sau vận hành | §4.4 | Nền tảng có; flywheel chưa đầy đủ |
| Upsell trả phí | §4.2–4.3 | UI stub; chưa PayOS B2C |
| Bỏ vật liệu | §4.5 | Đã ship consumer UX |
| B2B nhu cầu | §4.6 | Backlog |
| B2C chi tiêu / mua lại | §4.7 | Backlog |
| UX điền info vui | §4.8 | Đã ship cơ bản; cần polish |

---

## 5. Roadmap theo giai đoạn

### Phase A — MVP cải thiện (đồ án / demo GV) ✅ phần lớn đã ship

**Mục tiêu:** Chứng minh đúng góp ý cốt lõi trên demo ổn định.

| Hạng mục | Ưu tiên | Ghi chú |
|----------|---------|---------|
| Brand-coherent scoring + partnership seed | Must | Đã ship |
| Free OFF / Plus PREFER + upsell soft | Must | Đã ship (stub plan) |
| Ẩn material consumer | Must | Đã ship |
| Vibe quiz Gen Z | Must | Đã ship |
| Preference từ like/save/redirect | Must | Đã ship lightweight |
| Badge “Cùng brand / Partner” trên outfit | Should | Nhanh, tăng thuyết phục demo |
| Script demo GV (Free vs Plus toggle) | Must | Xem implementation notes |

### Phase B — v1 (sau bảo vệ / pilot nhỏ)

| Hạng mục | Ưu tiên |
|----------|---------|
| PayOS / thanh toán consumer Plus (tháng) | Must |
| Trial 7 ngày + webhook renew/cancel | Must |
| Consumer purchase / spend history UI | Must |
| Brand partnership admin CRUD | Should |
| Upsell trigger theo preference strength | Should |
| STRICT coherence (opt-in Plus advanced) | Could |
| Vibe share card + progressive profiling | Should |

### Phase C — v2 (scale sản phẩm)

| Hạng mục | Ưu tiên |
|----------|---------|
| B2B demand insights dashboard | Must |
| Wardrobe AI gap analysis (xem thêm `AI_ROADMAP.md`) | Should |
| Capsule / collab drop campaigns | Should |
| Calibrate preference offline + cold-start | Should |
| Multi-brand partner graph recommendations cho brand | Could |
| Full outfit VTON | Could (effort cao) |

```
Phase A (MVP+)          Phase B (v1)              Phase C (v2)
───────────────         ──────────────            ──────────────
Coherence + Free/Plus   Billing consumer          B2B insights
Vibe + prefs light      Spend tracker             Capsule / campaigns
Ẩn material             Partnership admin         Preference calibrate
Demo upsell             Smart paywall timing      Wardrobe AI gaps
```

---

## 6. Metric thành công & rủi ro

### 6.1 Metrics

| Metric | Phase A (demo) | Phase B–C (product) |
|--------|----------------|---------------------|
| Completion onboarding (body→vibe→chat) | ≥ 70% session bắt đầu | ≥ 60% user mới |
| % outfit Plus có ≥ 70% item cùng brand/partner | Có thể demo rõ Free vs Plus | ≥ 80% outfit Plus |
| Feedback rate (like/dislike / outfit) | ≥ 1 signal / session demo | ≥ 25% recommendation |
| Free → Plus conversion | N/A (toggle demo) | ≥ 3–5% mau trả phí sau 3 session |
| Buy-click CTR từ outfit | Theo dõi | Tăng so với baseline catalog |
| Brand: weekly insight open rate | — | ≥ 40% brand active |
| Spend tracker WAU | — | ≥ 20% Plus users |

### 6.2 Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|--------|-----|------------|
| Catalog mỏng → coherence Plus trống trải | Cao | Seed partnership + đủ SKU/brand trước demo; fallback “partner look” |
| Free quá kém → churn trước khi upsell | Trung bình | Free vẫn ra outfit đẹp (chỉ kém đồng bộ brand) |
| Preference bias sớm (like nhầm) | Trung bình | Decay weights; cho reset vibe |
| Hiểu nhầm “cào dữ liệu” = scrape lậu | Cao (pháp lý/học thuật) | Chỉ first-party + partner; ghi rõ trong báo cáo GV |
| PayOS B2C phức tạp cho đồ án | Trung bình | Giữ stub entitlement đến khi cần pilot thật |
| Privacy B2B insights | Cao | Aggregate, không PII; consent |

---

## 7. Gợi ý triển khai kỹ thuật (liên hệ codebase)

### 7.1 Module đã có — nên tận dụng

| Domain | Code chính |
|--------|------------|
| Entitlement Free/Plus | `ConsumerEntitlementService`, `ConsumerEntitlementController`, `ConsumerPlan` |
| Coherence | `OutfitCoherenceMode`, `OutfitScoringService`, `OutfitScoreContext` |
| Partnership | `BrandPartnership*`, migration `V12__brand_coherence_consumer_prefs.sql` |
| Preference | `PreferenceLearningService`, `UserPreferenceWeights` |
| Feedback hook | `FeedbackService` → preference |
| Buy-click signal | `RedirectService` → `applyRedirectSignal` |
| Upsell UI | `PlusUpsellBanner`, `FitMePlusUpsellCard`, `/pricing` |
| Onboarding | `frontend/src/app/ai/body-profile`, `vibe-quiz`, `chat` |

### 7.2 Hướng implement ngắn cho backlog ưu tiên

1. **Badge coherence (Phase A polish)**  
   Frontend outfit card: nếu mọi item cùng `brandId` → “Cùng brand”; nếu trong partner set → “Partner look”. Backend có thể trả `coherenceLabel` trong explanation DTO.

2. **Spend tracker (Phase B)**  
   Aggregate `BuyClickEvent` theo `userId`: list + sum `price` (nullable) + group by brand. Trang consumer `/me/spending`. Nút “Mở lại link mua”.

3. **Smart upsell (Phase B)**  
   Khi `brandWeights` top-1 vượt ngưỡng & plan=FREE → inject `FitMePlusUpsellCard` với copy: “Bạn đang nghiêng về brand X — Plus giúp cả set đồng bộ X / đối tác”.

4. **B2B insights (Phase C)**  
   Job nightly: aggregate feedback + redirect theo `brandId` (chỉ brand đó). Endpoint `/api/v1/brand/insights/weekly`. Không expose user id.

5. **STRICT mode (Phase B/C)**  
   Khi mode=STRICT: filter candidate không cùng brand/partner trước sort (không chỉ soft score). Config qua `FitMeProperties.consumer.plusCoherenceMode`.

6. **Material**  
   Giữ cột DB; không surface consumer; regression test: product detail consumer không render “Chất liệu”.

### 7.3 Việc cố ý không làm

- Scrape catalog / review từ Shopee–TikTok không có thỏa thuận.
- Ép Free ra outfit xấu để upsell (phá trust Gen Z).
- Form body kiểu “phòng khám” dài trở lại.

### 7.4 Tài liệu liên quan

| Doc | Vai trò |
|-----|---------|
| [`IMPLEMENTATION_NOTES_CAI_THIEN.md`](./IMPLEMENTATION_NOTES_CAI_THIEN.md) | Chi tiết đã ship + cách verify local |
| [`AI_ROADMAP.md`](./AI_ROADMAP.md) | Lộ trình AI (VTON, wardrobe, embeddings) |
| [`AI_ARCHITECTURE.md`](./AI_ARCHITECTURE.md) | Kiến trúc AI services |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Tổng quan hệ thống |

---

## 8. Kết luận ngắn cho báo cáo / trao đổi GV

FitMe chọn **Gen Z VN** làm thị trường mũi nhọn; biến góp ý “cùng brand” thành **đòn bẩy phân tầng Free/Plus**; dùng **vòng cá nhân hóa hành vi** để tăng giá trị cảm nhận rồi mới upsell; **bỏ chất liệu** khỏi trải nghiệm tư vấn; và tách rõ **B2C memory chi tiêu** với **B2B insights hợp pháp** thay vì scraping. Phần Must của đồ án đã có nền tảng trong code (entitlement, partnership scoring, preference, vibe onboarding); các bước tiếp theo tập trung **billing consumer, spend tracker, insights brand, và làm rõ coherence trên UI**.
