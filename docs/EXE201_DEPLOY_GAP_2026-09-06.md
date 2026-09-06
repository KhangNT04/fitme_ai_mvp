# FitMe AI — Báo cáo kiểm thử deploy & gap EXE201

**Ngày:** 2026-09-06  
**URL test:** https://fitme-ai-mvp.vercel.app/  
**Phương pháp:** Browser + API live; ảnh test `OneDrive/Hình ảnh/test FITME` (`test_vton_ai.png`, `ao_viet_nam_test.jpg`)  
**Chỉ tiêu đối chiếu:** EXE201 OC1 / OC2 / OC3 (MVP deploy, marketing, ≥20 paid users + dashboard)

---

## 1. Tóm tắt nhanh

| Hạng mục EXE201 | Kết luận trên deploy hiện tại |
|-----------------|--------------------------------|
| **OC1 — MVP deployed (Web)** | **Đạt mức web** — app public chạy được: auth, discover, stylist chat, try-on (board), profile, brand/admin portal |
| **OC1 — APK / CH Play / App Store** | **Chưa có** — chỉ web (Vercel). Muốn điểm tối đa OC1 cần APK hoặc store |
| **OC1 — Project management timeline** | **Ngoài app** — cần bằng chứng Jira/Trello/Notion (không kiểm được từ URL) |
| **OC2 — Marketing ≥2 kênh + đo visit/download** | **Thiếu trong product** — không thấy GTM/GA/Meta/TikTok pixel trên HTML; chưa có dashboard marketing visit/download trong app |
| **OC3 — ≥20 paid users + analytics dashboard** | **Chưa đạt theo nghĩa consumer trả tiền** — Plus chỉ là **demo toggle**; brand billing PayOS live nhưng chỉ **3 brand** có gói. Không có báo cáo “20 paid users” sẵn |

**Verdict sản phẩm kỹ thuật:** MVP web **dùng được để demo tư vấn size/phối đồ**.  
**Verdict nộp EXE201:** còn **lỗ hổng lớn ở OC2 + OC3 (paid users) + APK**; web một mình **không đủ** checklist đầy đủ.

---

## 2. Kết quả kiểm thử chức năng (deploy)

### 2.1 Health / auth

| Check | Kết quả |
|-------|---------|
| Home `/` | OK — hero, CTA tư vấn / discover |
| Login `user@fitme.ai` / `fitme123` | OK → `/profile` (Demo User) |
| Login `admin@fitme.ai` | OK — role ADMIN |
| Login `brand@fitme.ai` | OK — role BRAND_OWNER |
| `/api/v1/products` (không truyền `size=`) | **36** SP ACTIVE public |
| Admin dashboard | `activeUsers=11`, `totalProducts=48`, `totalTryOns=44`, `totalRecommendations=120` |

### 2.2 Discover / catalog

- UI `/discover`: có brand sections (K-Style House, …), giá, nút Thử AI.
- **Lưu ý kỹ thuật:** query `?size=20` bị backend hiểu là **filter size sản phẩm** → trả `[]`. Không dùng `size` làm page size.

### 2.3 Tư vấn AI (logic cốt lõi đề tài)

| Bước | Kết quả |
|------|---------|
| `/ai/start` → body profile nếu thiếu | OK |
| `/ai/chat` chip “Đi chơi cafe…” | OK — loading rồi ra **4 outfit** |
| Gợi ý size / form / màu + giải thích | OK (vd. Size S · dự phòng M; form Regular; màu Đen) |
| Nút Thử AI / Lưu / Thích / Pass | Có trên card |
| Nguồn stylist | API starter/messages trả `stylistSource: "rule"` (rule engine; Gemini có thể không gắn/404) |
| Starter “3 style phía trên” lúc vào chat | **Yếu** — copy nhắc xem style trên nhưng lần mở chat không thấy card ảnh starter (0 img); chat theo chip thì mới ra outfit |

### 2.4 Try-on + ảnh test FITME

| Bước | Kết quả |
|------|---------|
| Consent + upload `test_vton_ai.png` | OK — `UPLOADED`, fileUrl `/uploads/user-photos/...` (HTTP 200) |
| Tạo try-on + add item `role=TOP` | OK |
| Generate `USER_PHOTO` | **Fallback** → `COMPLETED` nhưng `previewMode/type=OUTFIT_BOARD_ONLY`, `previewSource=OUTFIT_BOARD` (ảnh catalog, **không** VTON thật trên người) |
| Catalog image `/catalog/products/...` | 200 |

**Ý nghĩa demo:** “Thử mặc AI” trên deploy hiện chủ yếu là **outfit board minh họa**, chưa chứng minh được try-on ảnh user end-to-end trên production.

### 2.5 Free / Plus & billing

| Check | Kết quả |
|-------|---------|
| `/pricing` | Có; copy ghi rõ **demo, chưa PayOS consumer** |
| Toggle Plus | Hoạt động (UI “Đang dùng” Plus) — **không phải thanh toán** |
| Brand checkout PayOS | `mockPaid:false`, có `checkoutUrl` pay.payos.vn — **PayOS brand live** |
| Brand có gói active | **3/5** (K-Style House, Linen Muse, Seoul Basic — Growth) |

### 2.6 Analytics trong app (có / thiếu)

| Có | Thiếu so với EXE201 |
|----|---------------------|
| Admin dashboard (users, products, try-ons, recs) | Báo cáo **paid users ≥ 20** |
| Brand dashboard / redirect analytics / demand insights | Marketing **visits / downloads** |
| Buy clicks brand (vd. 7) | Pixel / GA4 / Meta / TikTok trong FE |
| Tủ chi tiêu consumer (redirect history) | Funnel marketing 2 kênh có bằng chứng trong app |

---

## 3. Map EXE201 — thiếu gì để đạt chỉ tiêu

### OC1 — MVP & quản lý dự án (≈40%)

| Yêu cầu | Hiện trạng | Việc cần làm |
|---------|------------|--------------|
| MVP deployed Web | **Có** Vercel | Giữ URL ổn định; smoke trước bảo vệ |
| APK (≤8đ) / CH Play–App Store (10đ) | **Không** | Wrap PWA/Capacitor → APK; hoặc TWA; nộp store nếu kịp (duyệt ≥1 tuần) |
| Timeline + tool PM | Không kiểm từ web | Screenshot Jira/Trello/Notion + Gantt trong báo cáo OC1 |

### OC2 — Marketing

| Yêu cầu | Hiện trạng | Việc cần làm |
|---------|------------|--------------|
| ≥2 kênh marketing hiệu quả | Ngoài app (FB/TikTok/IG?) — **không gắn tracking trong code** | Chạy thật 2 kênh + gắn **GA4 + Meta Pixel** (hoặc TikTok Pixel) vào `frontend` |
| Mô hình định giá marketing rõ | Có `/pricing` Free/Plus + gói brand | Slide định giá + CAC/LTV giả định trong báo cáo |
| Đo visits / downloads | **Không** trong HTML deploy | GA4 realtime + UTM; nếu có APK thì đo install (Play Console) |

### OC3 — Tài chính / paid users (≥20) + dashboard

| Yêu cầu | Hiện trạng | Việc cần làm |
|---------|------------|--------------|
| ≥20 **paid users** | Consumer Plus = **flag demo**; brand paid ≈ **3** | **Phải chọn 1 định nghĩa rõ với GV rồi chứng minh bằng dashboard:** |
| | | **A (khuyến nghị nhanh):** định nghĩa “paid” = brand/subscription PayOS đã `PAID` → seed/checkout thật ≥20 order (hoặc 20 tài khoản brand/user đã thanh toán test nhỏ) + export PayOS |
| | | **B:** làm PayOS **consumer Plus** thật + ≥20 giao dịch |
| | | **C (nếu GV chấp nhận “trick”):** admin script gán PLUS + bảng admin “Paid users” — **hỏi GV trước**, ghi rõ trong báo cáo |
| Dashboard pricing / user analytics | Admin + brand có một phần | Thêm trang admin: **số user PLUS / doanh thu PayOS / chart 30 ngày**; screenshot vào OC3 |

---

## 4. Lỗi / khoảng trống kỹ thuật ảnh hưởng demo

1. **VTON production không ra ảnh user** — generate `USER_PHOTO` → outfit board. Kiểm tra `AI_VTON_URL`, FASHN/HF key, R2 public URL trên backend Hetzner/Render.  
2. **Chat starter cards thiếu trên UI** dù API starter trả options — UX “3 style phía trên” gãy lúc cold open.  
3. **Stylist đang `rule`**, không Gemini — vẫn tư vấn được nhưng slide nên nói “hybrid / fallback”.  
4. **Param `size` trùng nghĩa** page size vs size quần áo — tránh gọi `/products?size=20`.  
5. **Không có marketing pixel** — OC2 yếu nếu chỉ nộp URL.  
6. **Consumer không có receipt PayOS** — OC3 dễ bị hỏi “paid thật chưa?”.

---

## 5. Checklist ưu tiên trước hạn nộp

### P0 — bắt buộc cho điểm EXE201

1. Chốt với GV: **paid user = consumer hay brand?**  
2. Đạt **≥20 paid** theo định nghĩa đó + **screenshot dashboard + giao dịch**.  
3. Gắn **ít nhất GA4** (visit) + 1 kênh ads có UTM; chuẩn bị 2 kênh marketing.  
4. Video demo MVP + TVC (nộp ngoài app).  
5. Bằng chứng PM timeline.

### P1 — chất lượng demo bảo vệ

6. Sửa VTON trên deploy (USER_PHOTO thật) dùng ảnh `test FITME`.  
7. Fix starter outfit cards trên `/ai/chat`.  
8. APK (Capacitor) nếu còn thời gian — nâng OC1.

### P2 — nice

9. Consumer PayOS Plus thật.  
10. Đổi tên query page size (`pageSize`) để khỏi đụng `size`.

---

## 6. Bằng chứng số liệu (snapshot API 2026-09-06)

```
Admin dashboard: activeUsers=11, totalProducts=48, totalTryOns=44, totalRecommendations=120
Public products: 36
Brand plans active: 3 (Growth)
Brand buy clicks (K-Style sample dashboard): 7
Consumer Plus: demo toggle only
Brand checkout: PayOS live URL, mockPaid=false
Try-on USER_PHOTO → OUTFIT_BOARD fallback
Photo upload test_vton_ai.png: 200
Chat cafe chip: 4 outfits + size advice OK
Marketing pixels in homepage HTML: none detected
```

---

*File này bổ sung cho `SYSTEM_AUDIT_2026-08-25.md` (audit codebase). Đây là audit **deploy live + EXE201**.*
