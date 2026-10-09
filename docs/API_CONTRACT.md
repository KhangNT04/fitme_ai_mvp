# FitMe AI — API Contract (FE ↔ BE)

Base URL: `/api/v1` (proxied via Next.js rewrite in dev/production).

Tài liệu này định nghĩa hợp đồng API giữa Frontend và Backend theo mô hình hiện tại: người dùng dùng **FitMe Free / Premium** (Fitken, Nhận thưởng, Thư viện ảnh, Tủ đồ, brand yêu thích) và **mua tại cửa hàng gốc của brand**; brand niêm yết miễn phí và có thể mua **FitMe Brand Plus** (ưu tiên gợi ý, lượt thử đồ miễn phí cho khách, khách quan tâm, voucher giảm giá gói).

> **Đã gỡ ở V27 (`7ae8d1d`):** giỏ hàng, đặt hàng, thanh toán đơn, địa chỉ, đơn seller, vận đơn, đối soát, voucher freeship của người dùng và webhook vận chuyển. Các endpoint `/cart/**`, `/me/addresses/**`, `/orders/**`, `/me/vouchers`, `/brand/orders/**`, `/brand/shipments/**`, `/brand/settlements/**`, `/brand/payout-account`, `/brand/sales/summary`, `/admin/orders/**`, `/admin/commerce/summary`, `/admin/settlements/**`, `/webhooks/logistics` không còn tồn tại.

## Headers

| Header | Khi nào dùng |
|--------|--------------|
| `Authorization: Bearer <accessToken>` | Mọi request cần đăng nhập người dùng |
| `X-Anonymous-Session: <sessionToken>` | Luồng khách vãng lai (tư vấn ẩn danh, phiên thử đồ, sự kiện bấm mua) |
| `Content-Type: application/json` | Request có body JSON (trừ upload file multipart) |

## Response envelope

Tất cả endpoint trả về cấu trúc chuẩn:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "errorCode": null,
  "message": null
}
```

Khi lỗi nghiệp vụ: `success: false`, HTTP 4xx/5xx, `error` chứa thông điệp lỗi tiếng Việt, `errorCode` dùng để phân nhánh UI ở frontend:

```json
{
  "success": false,
  "data": null,
  "error": "Tủ đồ là tính năng của FitMe Premium",
  "errorCode": "PREMIUM_REQUIRED"
}
```

| HTTP | Nguồn | `errorCode` |
|---|---|---|
| 400 | Lỗi nghiệp vụ (`BusinessException`) | Theo bảng bên dưới, có thể `null` |
| 400 | Body sai cú pháp / enum lạ | `null`, `error` = "Dữ liệu gửi lên không hợp lệ" |
| 400 | Lỗi `@Valid` | `null`, `error` = các thông báo trường nối bằng dấu phẩy |
| 403 | Thiếu quyền theo vai trò (`@PreAuthorize`) | `null`, `error` = "Bạn không có quyền truy cập". Thiếu token ở API cần đăng nhập trả 403 body rỗng |
| 403 | Thiếu gói | `PREMIUM_REQUIRED` hoặc `PLUS_REQUIRED` |
| 404 | Không tìm thấy (`NotFoundException`) | `null` |
| 409 | Xung đột trạng thái (`ConflictException`) / trùng khoá DB | Mã riêng, hoặc `CONFLICT` "Dữ liệu bị trùng hoặc vừa được cập nhật, vui lòng thử lại" |
| 429 | Vượt giới hạn | Mã riêng (ví dụ `LOGIN_LOCKED`) |

Các `errorCode` thường gặp:

| `errorCode` | HTTP | Ý nghĩa |
|---|---|---|
| `FITKEN_INSUFFICIENT` | 400 | Hết Fitken: "Bạn đã hết Fitken. Nâng cấp FitMe Premium để nhận Fitken hàng tháng hoặc nhận thưởng để tiếp tục thử đồ AI." |
| `LOGIN_REQUIRED` | — | Tính năng cần đăng nhập (thử đồ AI) |
| `PREMIUM_REQUIRED` | 403 | Người dùng Free / khách gọi API Premium (tủ đồ, lưu brand yêu thích) |
| `PLUS_REQUIRED` | 403 | Brand không có Plus thao tác quyền lợi Plus: "Xem và xác nhận khách quan tâm là quyền lợi của FitMe Brand Plus. Nâng cấp để sử dụng." |
| `INVALID_PURCHASE_URL` | 400 | "Link mua hàng không hợp lệ, cần dạng https://... tới trang sản phẩm của cửa hàng" |
| `BRAND_SUSPENDED` | 400 | "Brand đã bị tạm ngưng. Vui lòng liên hệ FitMe để được hỗ trợ." |
| `BRAND_NOT_APPROVED` | 400 | Brand chưa duyệt (portal brand, phát voucher) |
| `BRAND_PLUS_UNAVAILABLE` | 400 | "Gói Brand Plus hiện chưa mở bán" |
| `BRAND_PREFERENCE_INVALID` | 400 | Dữ liệu brand yêu thích không hợp lệ |
| `SETTING_INVALID` | 400 | Giá trị cài đặt hệ thống không hợp lệ |
| `VOUCHER_RESERVED` | 409 | Voucher đang giữ cho một đơn Brand Plus chưa hoàn tất |
| `VOUCHER_USED`, `VOUCHER_REVOKED`, `VOUCHER_EXPIRED` | 400 khi dùng, 409 khi thu hồi | Voucher không còn dùng / thu hồi được |
| `VOUCHER_CAMPAIGN_INACTIVE`, `VOUCHER_CAMPAIGN_ENDED`, `VOUCHER_CAMPAIGN_NOT_STARTED`, `VOUCHER_CAMPAIGN_FULL` | 400 | Không phát được voucher |
| `ALREADY_CHECKED_IN`, `SHARE_INVALID_URL`, `SHARE_DUPLICATE`, `SHARE_DAILY_LIMIT`, `REVIEW_EXISTS` | 400 | Nhận thưởng, đánh giá |
| `TRY_ON_NOT_ELIGIBLE` | 400 | Thêm món vào phiên thử: sản phẩm bị ẩn, không đủ điều kiện thử AI hoặc chưa có ảnh thử đồ (`TRY_ON`) |
| `TRY_ON_ITEM_UNAVAILABLE` | 400 | `POST /try-on/requests/{id}/generate`: một món trong phiên đã bị ẩn / mất điều kiện / mất ảnh `TRY_ON` sau khi thêm. Không gọi AI, không trừ Fitken; thông báo nêu tên món cần bỏ |

## Service mapping

| Frontend service | Backend controller | Prefix | Vai trò / Auth |
|------------------|-------------------|--------|----------------|
| `session-api.ts` | `SessionController` | `/sessions` | Public |
| `auth-api.ts` | `AuthController` | `/auth` | Public |
| `entitlement-api.ts` | `ConsumerEntitlementController` | `/me/entitlement` | Public / Admin |
| `brand-preference-api.ts` | `BrandPreferenceController` | `/me/brand-preferences` | User auth (lưu cần Premium) |
| `profile-api.ts` | `ProfileController` | `/me` | User auth / Session |
| `wardrobe-api.ts` | `WardrobeController` | `/wardrobe` | Premium (security cho qua, controller trả `PREMIUM_REQUIRED`) |
| `product-api.ts` | `ProductController` | `/products` | Public |
| `recommendation-api.ts` | `RecommendationController` | `/recommendations` | Public / Session |
| `stylist-chat-api.ts` | `StylistChatController` | `/stylist` | Public / Session |
| `tryon-api.ts` | `TryOnController`, `TryOnOutfitController` | `/try-on` | User auth / Session |
| `upload-api.ts` | `PhotoUploadController`, `PreviewController` | `/uploads`, `/previews` | User auth / Session |
| `redirect-api.ts` | `RedirectController` | `/redirects` | Public / Session |
| `privacy-api.ts` | `PrivacyController` | `/privacy` | User auth / Session |
| `fitken-api.ts` | `FitkenController` | `/me/fitken` | User auth |
| `subscription-api.ts` | `ConsumerSubscriptionController`, `PlanController` | `/me/subscription`, `/plans` | User auth / Public |
| `rewards-api.ts` | `RewardController` | `/rewards` | User auth |
| `review-api.ts` | `ReviewController` | `/products/{id}/reviews`, `/reviews` | Public / User auth |
| `gallery-api.ts` | `GalleryController` | `/me/gallery` | User auth |
| `brand-api.ts` | `BrandDashboardController`, `BrandProductController`, `BrandPublicController` | `/brand`, `/brands` | `BRAND_OWNER` / Public |
| `brand-plus-api.ts` | `BrandPlusController`, `BrandVoucherController` | `/brand/plan`, `/brand/vouchers` | `BRAND_OWNER` |
| `brand-lead-api.ts` | `BrandLeadController` | `/brand/leads` | `BRAND_OWNER` (chi tiết cần Plus) |
| `billing-api.ts` | `AdminBillingController`, `AdminBrandPlusController` | `/admin/billing/plans`, `/admin/brand-subscriptions` | `ADMIN` |
| `voucher-api.ts` | `AdminVoucherCampaignController` | `/admin/voucher-campaigns`, `/admin/brand-vouchers` | `ADMIN` |
| `settings-api.ts` | `AdminSystemSettingsController` | `/admin/settings` | `ADMIN` |
| `traffic-api.ts` | `SiteTrafficController` | `/analytics/visit`, `/admin/traffic` | Public / `ADMIN` |
| `admin-api.ts` | `AdminController`, `AdminUserController`, `AdminProductController`, `AdminFitkenController`, `AdminRewardController`, `AdminReviewController`, `AdminGalleryController` | `/admin` | `ADMIN` |

> **Bỏ hoàn toàn:** Các endpoint brand billing cũ `/api/v1/brand/billing/**`, `/api/v1/admin/billing/brands/**`, và endpoint tự bật gói `PUT /api/v1/me/entitlement`.

---

## Chi tiết các API

### 1. Fitken & Gói Premium

Gói người dùng **FitMe Premium** (`PREMIUM_MONTHLY`, mặc định 49.000đ / 30 ngày, +15 Fitken). Giá trị cũ `PRO` / `PLUS` của `consumer_plan` được đọc thành `PREMIUM`.

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/me/fitken` | User | Ví: `{ balance, subscriptionRemaining, bonusRemaining, trialGranted, tryOnCost, maxBalance, plan: FREE\|PREMIUM, subscription: { planId, planName, status, startsAt, expiresAt } \| null }`. `maxBalance` = trần Fitken miễn phí (cài đặt `fitken.max_balance`) |
| `GET` | `/me/fitken/ledger?page=0&size=20` | User | Lịch sử biến động ví `{ items: [{ id, entryType, delta, balanceAfter, note, createdAt }], page, size, total }` |
| `GET` | `/plans` | Public | Gói người dùng đang bán (không gồm gói brand): `[BillingPlanDto]` |
| `POST` | `/me/subscription/checkout` | User | Mua gói Premium / top-up: Body `{ planId }` → `{ orderId, payosOrderCode, checkoutUrl, mockPaid }`. Gói brand bị từ chối |
| `POST` | `/me/subscription/return` | User | Xác nhận PayOS trả về: Body `{ orderCode }` → `ConsumerBillingOrderDto` (đánh dấu PAID khi PayOS mock). Đơn của người khác bị từ chối |
| `GET` | `/me/subscription/orders` | User | 10 đơn gói gần nhất: `[{ orderId, payosOrderCode, planId, planName, amountVnd, status, checkoutUrl, createdAt, paidAt }]` |
| `GET` | `/me/entitlement` | Public | `{ plan: FREE\|PREMIUM, coherenceMode, premium, pro (deprecated, = premium), label, mixPolicy, upsellMessage, premiumPriceVnd, premiumMonthlyFitken }` |
| `PUT` | `/me/entitlement/users/{userId}` | Admin | Admin gán / huỷ Premium: Body `{ plan: FREE\|PREMIUM, coherenceMode? }` |
| `PATCH` | `/admin/users/{id}/consumer-plan` | Admin | Như trên, dùng ở trang Quản lý tài khoản ("Lên Premium" / "Về Free"). Lên Premium tạo kỳ 30 ngày và cộng Fitken của gói |
| `GET` | `/admin/consumers/{userId}/fitken` | Admin | Chi tiết ví Fitken và 50 ledger gần nhất của user |
| `POST` | `/admin/consumers/{userId}/fitken/adjust` | Admin | Điều chỉnh số dư: Body `{ delta, note }` (−10.000..10.000, khác 0). Không bị áp trần |

`BillingPlanDto`: `{ id, code, name, planType: SUBSCRIPTION\|TOPUP, audience: CONSUMER\|BRAND, priceVnd, fitkenAmount, billingPeriodDays, active, sortOrder, discountPercent, discountStartsAt, discountEndsAt, discountActive, effectivePriceVnd }`.

`BillingOrderStatus`: `PENDING` | `PAID` | `FAILED` | `CANCELLED` | `EXPIRED`. Đơn `PENDING` quá 24 giờ (`fitme.billing.pending-expiry-hours`) chuyển `EXPIRED`, quét mỗi 15 phút.

Trần Fitken miễn phí: các khoản `TRIAL_GRANT`, `CHECKIN_REWARD`, `SHARE_REWARD`, `REVIEW_REWARD` chỉ cộng tới `maxBalance` (cộng 0 thì không ghi ledger). Fitken từ gói Premium, top-up và admin điều chỉnh không bị áp trần.

### 1b. Brand yêu thích (Premium)

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/me/brand-preferences` | User | `{ mode: DIVERSE\|FAVORITES_ONLY, brandIds, brands: [{ id, name, logoUrl }], premium }`. Free đọc được, không lưu được |
| `PUT` | `/me/brand-preferences` | User Premium | Body `{ mode, brandIds }` → như GET |

Lỗi `PUT`:

- 403 `PREMIUM_REQUIRED` "Tùy biến phối đồ theo brand yêu thích là tính năng của FitMe Premium".
- 400 `BRAND_PREFERENCE_INVALID`:
  - "Vui lòng chọn chế độ phối đồ".
  - "Chỉ được chọn tối đa 10 brand yêu thích".
  - "Chọn ít nhất 1 brand yêu thích để dùng chế độ chỉ brand yêu thích".
  - "Brand đã chọn không tồn tại hoặc chưa được duyệt".

### 2. Nhận thưởng (Rewards)

Múi giờ tính toán: `Asia/Ho_Chi_Minh`. Thưởng bị giới hạn bởi trần Fitken miễn phí (`rewardGranted` có thể nhỏ hơn mức thưởng hoặc bằng 0).

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/rewards` | User | Tổng hợp nhận thưởng: `{ balance, checkin: { checkedInToday, currentStreak, streakTarget, daysUntilNextReward, rewardAmount, recentDays: [...] }, share: { rewardAmount, dailyLimit, remainingToday, allowedDomains: [...], recentClaims: [...] }, review: { rewardAmount, minContentLength, rewardedCount, dailyLimit, remainingToday } }` |
| `POST` | `/rewards/checkin` | User | Điểm danh hằng ngày → `{ checkedInToday: true, currentStreak, rewardGranted, balance }`. Gọi lại cùng ngày → lỗi `400 ALREADY_CHECKED_IN` |
| `POST` | `/rewards/share` | User | Gửi link chia sẻ bài đăng cá nhân: Body `{ postUrl, tryOnRequestId?, galleryImageId? }` → `ShareClaim { id, postUrl, platform, status, rewardGranted, createdAt }`. Lỗi: `SHARE_INVALID_URL`, `SHARE_DUPLICATE`, `SHARE_DAILY_LIMIT` |
| `GET` | `/rewards/share` | User | Lịch sử các lượt nộp bài chia sẻ của tôi |
| `GET` | `/admin/rewards/shares?status=` | Admin | Danh sách link chia sẻ cần duyệt |
| `POST` | `/admin/rewards/shares/{id}/reject` | Admin | Từ chối link và thu hồi Fitken: Body `{ note? }` |

### 3. Đánh giá sản phẩm (Reviews)

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/products/{productId}/reviews?page=0&size=10` | Public | Danh sách đánh giá: `{ averageRating, totalCount, items: [{ id, rating, content, imageUrls, authorName, verifiedPurchase, createdAt }] }`. `verifiedPurchase` = người viết đã bấm mua qua FitMe và tự xác nhận đã mua, hoặc brand Plus tích "Đã bán" cho lead của họ |
| `POST` | `/products/{productId}/reviews` | User | Viết đánh giá: Body `{ rating (1-5), content, imageUrls: [] }` → `{ review, rewardGranted, rewardLimitReached }`. Thưởng +2 Fitken nếu có ≥1 ảnh & nội dung ≥ 20 ký tự, tối đa 1 đánh giá được thưởng/ngày. Trùng → `400 REVIEW_EXISTS` |
| `POST` | `/reviews/images` | User | Upload ảnh đính kèm đánh giá: multipart file `file` → `{ url }` |
| `GET` | `/admin/reviews?status=` | Admin | Danh sách đánh giá cần kiểm duyệt |
| `POST` | `/admin/reviews/{id}/hide` | Admin | Ẩn đánh giá vi phạm: Body `{ reason? }` |

### 4. Thư viện ảnh phối đồ (Outfit Gallery)

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/me/gallery?page=0&size=24` | User | Danh sách ảnh phối đồ đã lưu: `{ items: [{ id, imageUrl, tryOnRequestId, previewSource, products: [{ productId, name, imageUrl, price }], createdAt }], page, size, total }` |
| `DELETE` | `/me/gallery/{id}` | User | Xóa mềm ảnh khỏi thư viện cá nhân |
| `GET` | `/admin/gallery/stats` | Admin | Thống kê: `{ totalImages, imagesLast7Days, usersWithImages }` |

### 5. Mua tại cửa hàng gốc & chia sẻ thông tin với brand

FitMe không bán hàng. Nút mua tạo sự kiện bấm mua rồi chuyển khách tới `purchaseUrl` của sản phẩm.

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `POST` | `/redirects/buy-click` | Public / Session | Body `{ productId, sourcePage, recommendationId?, tryOnRequestId?, selectedSize?, selectedColor? }` → `{ eventId, redirectUrl, channel }`. Người dùng đăng nhập **đang đồng ý** `BRAND_LEAD_SHARING` tạo 1 khách quan tâm / sản phẩm / ngày cho brand; khách vãng lai không tạo |
| `GET` | `/redirects/{eventId}` | Public | Lấy lại sự kiện (trang `/redirect/loading` dùng URL của sự kiện, bỏ qua `?url=`) |
| `GET` | `/redirects/history` | User | Lịch sử bấm mua: `{ items: [{ eventId, productId, productName, brandName, price, currency, purchaseUrl, channel, selectedSize, selectedColor, purchasedConfirmed, purchasedConfirmedAt, clickedAt }] }` |
| `POST` | `/redirects/{eventId}/purchased` | User | Tự xác nhận đã mua (dùng cho nhãn "Đã mua hàng" của đánh giá) |
| `POST` | `/privacy/consent` | User / Session | Body `{ consentType: PRIVACY_NOTICE\|PHOTO_UPLOAD\|WARDROBE_IMAGE_UPLOAD\|AI_PREVIEW\|BRAND_LEAD_SHARING, accepted }`. Bản ghi mới nhất có hiệu lực; `accepted=false` là rút lại |
| `GET` | `/privacy/consent` | User / Session | `{ [consentType]: boolean }` theo bản ghi mới nhất |
| `POST` | `/privacy/deletion-requests` | User | Yêu cầu xoá dữ liệu. Xoá "Toàn bộ tài khoản" ẩn danh hoá khách quan tâm (`brand_leads.user_id = NULL`), xoá brand yêu thích |

`purchaseUrl` của sản phẩm là **bắt buộc** khi brand tạo / sửa (`POST|PUT /brand/products`): trống → "Link mua hàng không được để trống"; tối đa 2048 ký tự; sai dạng → `INVALID_PURCHASE_URL`. Admin không duyệt được sản phẩm thiếu link hợp lệ.

### 6. Thử đồ AI: báo giá và lượt miễn phí brand Plus

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/try-on/quote?productIds=a,b` | Public / User | Tối đa 20 sản phẩm ("Tối đa 20 sản phẩm cho một lượt thử đồ") → `{ free, freeRemainingToday, freeDailyLimit, fitkenCost, allPlus }`. `free=true` khi mọi sản phẩm thuộc brand đang Plus và người dùng đăng nhập còn lượt miễn phí hôm nay (cài đặt `tryon.plus_free_daily`, mặc định 3). Khách luôn `free=false` |
| `POST` | `/try-on/requests/{id}/generate` | User | Sinh ảnh: dùng lượt miễn phí nếu được (`freeTry=true`, `chargedFitken=0`), nếu không trừ Fitken. Lỗi nhà cung cấp hoàn lượt miễn phí, không cộng Fitken |

### 7. Brand Plus (cổng brand)

Mọi endpoint `/brand/**` cần `BRAND_OWNER` và brand đã duyệt (`BRAND_SUSPENDED` / `BRAND_NOT_APPROVED`). Plus có hiệu lực khi `status = ACTIVE` và hiện tại trước `endsAt`; gia hạn cộng nối vào `endsAt` hiện tại.

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/brand/plan` | Brand | `BrandPlusStatusDto { active, status: ACTIVE\|EXPIRED\|CANCELLED, startsAt, endsAt, planAvailable, planId, planCode, planName, billingPeriodDays, listPriceVnd, effectivePriceVnd, discountActive, discountPercent, discountStartsAt, discountEndsAt, pendingOrder: BrandBillingOrderDto \| null }` |
| `GET` | `/brand/plan/quote?voucherId=` | Brand | `{ listPriceVnd, billingPeriodDays, windowPercent, voucherId, voucherCode, voucherPercent, appliedPercent, source: NONE\|WINDOW\|VOUCHER, amountVnd, voucherApplied, voucherIgnoredReason }` |
| `POST` | `/brand/plan/checkout` | Brand | Body `{ voucherId? }` (chỉ trường này; số tiền do server tính) → `{ orderId, orderCode, listPriceVnd, discountPercentApplied, discountSource, amountVnd, checkoutUrl, mock, voucherId, voucherCode, voucherApplied, voucherIgnoredReason }`. Voucher được áp dụng chuyển sang `RESERVED` |
| `GET` | `/brand/plan/orders/{orderCode}` | Brand | `BrandBillingOrderDto { orderId, orderCode, planName, listPriceVnd, discountPercentApplied, voucherCode, amountVnd, status, checkoutUrl, createdAt, paidAt, plusEndsAt }`. Chế độ mock: mở là đánh dấu PAID |
| `POST` | `/brand/plan/orders/{orderCode}/cancel` | Brand | Huỷ đơn `PENDING`, trả voucher về `ISSUED` |

Quy tắc giảm giá: chỉ áp dụng **một** mức, lấy mức cao hơn giữa giảm theo thời gian của gói (`WINDOW`) và voucher (`VOUCHER`). Hoà hoặc chương trình cao hơn thì giữ voucher, `voucherIgnoredReason` = "Chương trình đang giảm X%, nhiều hơn voucher (Y%) / bằng mức voucher, nên FitMe áp dụng mức giảm của chương trình và giữ lại voucher cho lần sau."

Lỗi:

| HTTP | `errorCode` | Thông điệp |
|---|---|---|
| 400 | `BRAND_PLUS_UNAVAILABLE` | "Gói Brand Plus hiện chưa mở bán" |
| 400 | — | "Giá gói sau giảm phải lớn hơn 0đ. Vui lòng liên hệ FitMe để được kích hoạt." |
| 404 | — | "Đơn thanh toán không tồn tại" (kể cả đơn của brand khác) |
| 404 | — | "Voucher không tồn tại" (kể cả voucher của brand khác) |
| 409 | `VOUCHER_RESERVED` | "Voucher đang được giữ cho một đơn thanh toán chưa hoàn tất. Hãy hủy đơn đó hoặc chờ đơn hết hạn để dùng lại voucher." |
| 400 | `VOUCHER_USED` / `VOUCHER_REVOKED` / `VOUCHER_EXPIRED` | "Voucher đã được sử dụng" / "Voucher đã bị thu hồi" / "Voucher đã hết hạn" |

Webhook PayOS (`/webhooks/payos`) dùng chung cho đơn người dùng và đơn brand: chỉ kích hoạt khi chữ ký đúng, `code = 00` và đủ số tiền; gửi lại không cộng thêm kỳ. `FAILED` trả voucher; webhook thành công sau đó vẫn chuyển PAID.

### 8. Voucher brand & khách quan tâm (cổng brand)

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/brand/vouchers` | Brand | Voucher của brand: `[{ id, code, campaignName, discountPercent, status: ISSUED\|RESERVED\|USED\|REVOKED\|EXPIRED, usable, issuedAt, expiresAt, usedAt, reservedOrderCode }]`. Voucher `ISSUED` quá hạn hiện `EXPIRED` ngay cả khi job chưa chạy |
| `GET` | `/brand/leads?from=&to=&productId=&sold=&page=0&size=20` | Brand | `{ plusRequired, summary: { total, sold, last30Days }, items: [BrandLeadDto], page, size, totalItems, totalPages }`. Brand không Plus: `plusRequired=true`, chỉ có `summary`, `items` rỗng. `from` / `to` là ngày ISO; `from > to` → "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc" |
| `PATCH` | `/brand/leads/{id}/sold` | Brand Plus | Body `{ sold: boolean }` → `BrandLeadDto`. Thiếu → "Thiếu trạng thái đã bán"; không Plus → 403 `PLUS_REQUIRED`; lead của brand khác → 404 "Khách quan tâm không tồn tại" |
| `GET` | `/brand/dashboard` | Brand | Thêm `tryOnCustomers7d`, `tryOnCustomers30d`, `topTryOnProducts: [{ productId, productName, customers }]` (tối đa 10), `funnel30d: { tryOnCustomers, buyClickCustomers, soldLeads }`. Không chứa PII; không cần Plus |

`BrandLeadDto`: `{ id, productId, productName, customerName, customerEmail, customerStatus: VISIBLE\|WITHDRAWN\|ANONYMIZED, size, color, createdAt, confirmedSoldAt }`. Tên và email chỉ có khi `VISIBLE` (khách vẫn đang đồng ý); `WITHDRAWN` = khách đã rút đồng ý, `ANONYMIZED` = khách đã xoá tài khoản.

### 9. Quản trị: gói dịch vụ, Brand Plus, voucher brand

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/admin/billing/plans?audience=CONSUMER\|BRAND` | Admin | Danh sách gói (bỏ `audience` = tất cả): `[BillingPlanDto]` |
| `GET` | `/admin/billing/plans/{id}` | Admin | Chi tiết gói |
| `POST` | `/admin/billing/plans` | Admin | Tạo gói: Body `{ code, name, planType, audience, priceVnd, fitkenAmount, billingPeriodDays, active, sortOrder, discountPercent?, discountStartsAt?, discountEndsAt? }` |
| `PUT` | `/admin/billing/plans/{id}` | Admin | Cập nhật gói (không đổi được `code`, `audience`) |
| `DELETE` | `/admin/billing/plans/{id}` | Admin | Xoá gói chưa có người mua |
| `GET` | `/admin/brand-subscriptions` | Admin | Brand đã mua Plus: `[{ brandId, brandName, status, active, startsAt, endsAt }]` |
| `GET` | `/admin/brands` | Admin | Thêm `plusActive`, `plusEndsAt` cho mỗi brand |
| `GET` | `/admin/voucher-campaigns` | Admin | `[VoucherCampaignDto]` |
| `GET` | `/admin/voucher-campaigns/{id}` | Admin | `VoucherCampaignDto` |
| `POST` | `/admin/voucher-campaigns` | Admin | Body `VoucherCampaignRequest { name, description?, discountPercent (1–99), vouchersPerBrand (1–100), maxBrands (≥ 1), validFrom?, validUntil?, active }` |
| `PUT` | `/admin/voucher-campaigns/{id}` | Admin | Như trên; đổi % không ảnh hưởng voucher đã phát |
| `POST` | `/admin/voucher-campaigns/{id}/issue` | Admin | Body `{ brandIds: [] }` → `{ issued: [{ brandId, brandName }], skipped: [...], vouchersIssued, campaign }`. Brand đã nhận được bỏ qua |
| `GET` | `/admin/voucher-campaigns/{id}/vouchers` | Admin | `[{ id, campaignId, brandId, brandName, code, discountPercent, status, issuedAt, expiresAt, reservedOrderCode, usedOrderCode, usedAt, revokedAt }]` |
| `POST` | `/admin/brand-vouchers/{id}/revoke` | Admin | Thu hồi voucher `ISSUED` → `REVOKED` (gọi lại với voucher đã thu hồi không lỗi) |

`VoucherCampaignDto`: `{ id, name, description, discountPercent, vouchersPerBrand, maxBrands, validFrom, validUntil, active, ended, createdAt, updatedAt, issuedBrandCount, voucherCount, voucherCountsByStatus }`.

Lỗi gói dịch vụ (400):

- "Phần trăm giảm giá phải từ 0 đến 100".
- "Thời điểm kết thúc giảm giá phải sau thời điểm bắt đầu".
- "Gói brand phải là gói theo chu kỳ (SUBSCRIPTION)".
- "Gói người dùng cần số Fitken >= 1".
- "Giảm giá hiện chỉ áp dụng cho gói brand".
- "Không thể đổi đối tượng của gói (người dùng / brand)".
- "Gói tháng cần billingPeriodDays > 0".
- "Mã gói đã tồn tại".
- "Gói đã có người mua — hãy tắt gói (active=false) thay vì xóa".

Lỗi voucher (admin):

| HTTP | `errorCode` | Thông điệp |
|---|---|---|
| 400 | `VOUCHER_CAMPAIGN_INACTIVE` | "Chiến dịch đang tắt, không thể phát voucher" |
| 400 | `VOUCHER_CAMPAIGN_ENDED` | "Chiến dịch đã hết hạn, không thể phát voucher" |
| 400 | `VOUCHER_CAMPAIGN_NOT_STARTED` | "Chiến dịch chưa bắt đầu, chưa thể phát voucher" |
| 400 | `VOUCHER_CAMPAIGN_FULL` | "Chiến dịch chỉ phát cho tối đa N brand (đã phát X, còn Y suất)" |
| 400 | `BRAND_NOT_APPROVED` | "Brand "…" chưa được duyệt hoặc đang bị tạm ngưng" |
| 400 | — | "Chọn ít nhất một brand"; "Thời điểm kết thúc phải sau thời điểm bắt đầu"; "Số brand tối đa không được nhỏ hơn số brand đã nhận voucher (n)" |
| 404 | — | "Chiến dịch voucher không tồn tại"; "Brand không tồn tại: {id}" |
| 409 | `VOUCHER_RESERVED` | "Voucher đang được giữ cho một đơn thanh toán chưa hoàn tất, chưa thể thu hồi" |
| 409 | `VOUCHER_USED` | "Voucher đã được sử dụng, không thể thu hồi" |
| 409 | `VOUCHER_EXPIRED` | "Voucher đã hết hạn, không cần thu hồi" |

### 10. Quản trị: cài đặt hệ thống

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/admin/settings` | Admin | `[{ key, value, defaultValue, label, description, min, max, updatedAt }]` |
| `PUT` | `/admin/settings/{key}` | Admin | Body `{ value }` → `SystemSettingDto`. Hiệu lực trong ≤ 60 giây (cache) |

| `key` | Nhãn | Mặc định | Khoảng |
|---|---|---|---|
| `fitken.max_balance` | Trần Fitken miễn phí | 50 | 0–100000 |
| `tryon.plus_free_daily` | Lượt thử đồ miễn phí mỗi ngày (brand Plus) | 3 | 0–100 |
| `recommendation.plus_boost` | Điểm ưu tiên gợi ý (brand Plus) | 15 | 0–100 (0 = tắt) |

Lỗi: 404 "Cài đặt không tồn tại"; 400 `SETTING_INVALID` với một trong các thông điệp:

- `Vui lòng nhập giá trị cho "X"`.
- `"X" phải là số nguyên`.
- `"X" phải nằm trong khoảng a - b`.

### 11. Quản trị: tài khoản, tăng trưởng, khách quay lại, truy cập

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/admin/dashboard` | Admin | `{ totalBrands, pendingBrands, totalProducts, pendingProducts, flaggedLinks, totalUsers, activeUsers, totalRecommendations, totalTryOns }` |
| `GET` | `/admin/users?q=&role=&status=&page=0&size=20` | Admin | Danh sách tài khoản (không gồm tài khoản đã xóa): `{ items: [{ id, email, displayName, role, status, emailVerified, consumerPlan, fitkenBalance, createdAt, lastActiveDate, brandName, signupSource }], total, page, size, summary: { totalAccounts, consumers, brandOwners, admins, suspended, premiumUsers } }`. `q` tìm theo email/tên |
| `GET` | `/admin/users/{id}` | Admin | Chi tiết một tài khoản |
| `PATCH` | `/admin/users/{id}/status` | Admin | Khóa/mở khóa: Body `{ status: ACTIVE\|SUSPENDED }`. Không khóa được chính mình hoặc admin khác. Tài khoản bị khóa mất phiên ngay; đăng nhập/refresh → `400 ACCOUNT_LOCKED` |
| `GET` | `/admin/metrics?days=30` | Admin | Tăng trưởng: người dùng hoạt động, nguồn đăng ký, phễu Đăng ký → Xác minh email → Dùng tư vấn / thử đồ AI → Bắt đầu thanh toán gói Premium → Đã thanh toán; doanh thu và thanh toán gói Premium |
| `GET` | `/admin/reports/paying-customers` | Admin | Chỉ giao dịch gói Premium (`PREMIUM_SUBSCRIPTION`) |
| `GET` | `/admin/reports/paying-customers/export` | Admin | CSV `fitme-khach-tra-tien-YYYY-MM-DD.csv` (UTF-8 BOM, chống CSV injection) |
| `GET` | `/admin/retention` | Admin | `{ today, dau, wau, mau, stickiness, retention: [{ day: 1\|7\|30, cohortFrom, cohortTo, retained, cohortSize, rate }], cohorts: [{ weekStart, size, activeUsers: [], rates: [] }], frequency: [{ key, label, minDays, maxDays, users }], inactive30d, totalConsumers, topUsers: [{ userId, displayName, email, lastActiveDate, activeDays30d, recommendations30d, tryOns30d, buyClicks30d }] }`. Chỉ tính tài khoản USER; tỉ lệ = `null` khi mẫu số bằng 0; 8 nhóm tuần, top 20 khách |
| `POST` | `/analytics/visit` | Public | Ghi lượt xem trang: Body `{ visitorId (UUID lưu ở localStorage), path? }` → `204`. Bỏ qua bot và tài khoản admin; mỗi trình duyệt = 1 khách/ngày |
| `GET` | `/admin/traffic?days=30` | Admin | Thống kê truy cập (7–90 ngày): `{ today, rangeDays, day, week, month: { visitors, pageViews, newVisitors, previousVisitors, changePct }, daily: [...], weekly: [...], monthly: [...], weekdays: [{ isoDay, avgVisitors }], assessment: { trend, trendChangePct, level, scale, volatility, avgDailyVisitors, recentAvgDailyVisitors, peakDate, peakVisitors, busiestWeekday, returningRate, pagesPerVisit } }` |

### 12. Webhooks

| Method | Path | Auth | Mô tả & Header |
|---|---|---|---|
| `POST` | `/webhooks/payos` | PayOS (chữ ký) | Xử lý thanh toán gói Premium, top-up Fitken và Brand Plus |

---

## Các API cốt lõi khác (vẫn duy trì)

### Session & Auth
- `POST /sessions/anonymous` — tạo session ẩn danh
- `GET /sessions/current` — session hiện tại
- `POST /sessions/link-to-user` — liên kết session sau đăng nhập
- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- `POST /auth/verify-email`, `/auth/resend-code`
- `POST /auth/forgot-password`, `/auth/reset-password`

### Profile & Wardrobe
- `GET|POST /me/body-profile`, `GET|POST /me/style-profile`
- `GET|POST|PUT|DELETE /wardrobe/items`, `POST /wardrobe/items/{id}/image` — chỉ Premium; Free / khách nhận 403 `PREMIUM_REQUIRED` "Tủ đồ là tính năng của FitMe Premium". Món đã có được giữ khi hết Premium

### Catalog & Gợi ý phối đồ
- `GET /products`, `GET /products/{id}`, `GET /products/{id}/similar` — sản phẩm và brand có `plusBrand` (brand đang Plus); gợi ý cộng điểm ưu tiên `recommendation.plus_boost` cho sản phẩm brand Plus
- `POST /recommendations` — tạo outfit gợi ý (Premium chế độ "Chỉ brand yêu thích" chỉ phối từ brand yêu thích)
- `GET /recommendations/{id}`, `POST /recommendations/{id}/save`, `GET /recommendations/saved`
- `POST /stylist/chat` — stylist chat tư vấn

### Thử đồ AI (Try-On)
- `POST /try-on/requests`, `POST /try-on/requests/{id}/items`
- `POST /try-on/requests/{id}/generate` — sinh ảnh thử đồ (tốn 1 Fitken nếu chọn mode `USER_PHOTO` hoặc `AVATAR`, trừ khi được lượt miễn phí brand Plus; `OUTFIT_BOARD_ONLY` miễn phí)
- `GET /try-on/requests/{id}/result`
- `GET /try-on/quote` — xem mục 6
