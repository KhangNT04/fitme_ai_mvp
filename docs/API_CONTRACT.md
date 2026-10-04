# FitMe AI — API Contract (FE ↔ BE)

Base URL: `/api/v1` (proxied via Next.js rewrite in dev/production).

Tài liệu này định nghĩa toàn bộ hợp đồng API giữa Frontend và Backend sau khi chuyển đổi sang mô hình **B2C** (FitMe Pro, Fitken, Nhận thưởng, Thư viện ảnh, Giỏ hàng & Đơn hàng in-app, Vận đơn và Đối soát seller).

## Headers

| Header | Khi nào dùng |
|--------|--------------|
| `Authorization: Bearer <accessToken>` | Mọi request cần đăng nhập người dùng |
| `X-Anonymous-Session: <sessionToken>` | Luồng khách vãng lai (tư vấn ẩn danh, giỏ hàng tạm) |
| `Content-Type: application/json` | Request có body JSON (trừ upload file multipart) |
| `X-Logistics-Token: <token>` | Webhook hãng vận chuyển đối tác gọi vào |

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

- Khi lỗi nghiệp vụ: `success: false`, HTTP 4xx/5xx, `error` chứa thông điệp lỗi tiếng Việt, `errorCode` dùng để phân nhánh UI ở frontend (ví dụ: `FITKEN_INSUFFICIENT`, `LOGIN_REQUIRED`, `ALREADY_CHECKED_IN`, `SHARE_DAILY_LIMIT`, `REVIEW_EXISTS`).

## Service mapping

| Frontend service | Backend controller | Prefix | Vai trò / Auth |
|------------------|-------------------|--------|----------------|
| `session-api.ts` | `SessionController` | `/sessions` | Public |
| `auth-api.ts` | `AuthController` | `/auth` | Public |
| `entitlement-api.ts` | `ConsumerEntitlementController` | `/me/entitlement` | Public / Admin |
| `profile-api.ts` | `ProfileController` | `/me` | User auth / Session |
| `wardrobe-api.ts` | `WardrobeController` | `/wardrobe` | User auth / Session |
| `product-api.ts` | `ProductController` | `/products` | Public |
| `recommendation-api.ts` | `RecommendationController` | `/recommendations` | Public / Session |
| `stylist-chat-api.ts` | `StylistChatController` | `/stylist` | Public / Session |
| `tryon-api.ts` | `TryOnController` | `/try-on/requests` | User auth / Session |
| `upload-api.ts` | `PhotoUploadController`, `PreviewController` | `/uploads`, `/previews` | User auth / Session |
| `redirect-api.ts` | `RedirectController` | `/redirects` | Public |
| `privacy-api.ts` | `PrivacyController` | `/privacy` | User auth |
| `fitken-api.ts` | `FitkenController` | `/me/fitken` | User auth |
| `subscription-api.ts` | `ConsumerSubscriptionController`, `PlanController` | `/me/subscription`, `/plans` | User auth / Public |
| `rewards-api.ts` | `RewardController` | `/rewards` | User auth |
| `review-api.ts` | `ReviewController` | `/products/{id}/reviews`, `/reviews` | Public / User auth |
| `gallery-api.ts` | `GalleryController` | `/me/gallery` | User auth |
| `voucher-api.ts` | `VoucherController` | `/me/vouchers` | User auth |
| `cart-api.ts` | `CartController` | `/cart` | User auth |
| `address-api.ts` | `AddressController` | `/me/addresses` | User auth |
| `order-api.ts` | `OrderController` | `/orders` | User auth |
| `seller-order-api.ts` | `BrandOrderController`, `BrandShipmentController`, `BrandSettlementController` | `/brand` | `BRAND_OWNER` |
| `brand-api.ts` | `BrandDashboardController`, `BrandProductController`, `BrandPublicController` | `/brand`, `/brands` | `BRAND_OWNER` / Public |
| `admin-commerce-api.ts` | `AdminOrderController`, `AdminSettlementController` | `/admin` | `ADMIN` |
| `admin-api.ts` | `AdminController`, `AdminProductController`, `AdminFitkenController`, `AdminRewardController`, `AdminReviewController`, `AdminGalleryController`, `AdminBillingController` | `/admin` | `ADMIN` |

> **Bỏ hoàn toàn:** Các endpoint brand billing cũ `/api/v1/brand/billing/**`, `/api/v1/admin/billing/brands/**`, và endpoint tự bật gói `PUT /api/v1/me/entitlement`.

---

## Chi tiết các API B2C

### 1. Fitken & Gói Pro

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/me/fitken` | User | Lấy thông tin ví `{ balance, subscriptionRemaining, bonusRemaining, trialGranted, tryOnCost, plan: FREE\|PRO, subscription: { planId, planName, status, startsAt, expiresAt } \| null }` |
| `GET` | `/me/fitken/ledger?page=0&size=20` | User | Lịch sử biến động ví `{ items: [{ id, entryType, delta, balanceAfter, note, createdAt }], page, size, total }` |
| `GET` | `/plans` | Public | Danh sách gói consumer đang bán `[{ id, code, name, priceVnd, fitkenAmount, freeshipVouchers, freeshipMaxDiscountVnd, billingPeriodDays }]` |
| `POST` | `/me/subscription/checkout` | User | Tạo link PayOS mua gói Pro: Body `{ planId }` → `{ orderId, payosOrderCode, checkoutUrl, mockPaid }` |
| `POST` | `/me/subscription/return` | User | Xác nhận thanh toán PayOS trả về: Body `{ orderCode }` → `{ orderId, status, paidAt }` (đánh dấu PAID khi PayOS mock) |
| `GET` | `/me/subscription/orders` | User | 10 đơn mua gói gần nhất |
| `GET` | `/me/entitlement` | Public | Thông tin quyền lợi hiển thị: `{ plan: FREE\|PRO, pro: boolean, plus: boolean, coherenceMode, label }` |
| `PUT` | `/me/entitlement/users/{userId}` | Admin | Admin gán/hủy Pro thủ công: Body `{ plan: FREE\|PRO, coherenceMode? }` |
| `GET` | `/me/vouchers` | User | Danh sách voucher freeship của người dùng |
| `GET` | `/admin/consumers/{userId}/fitken` | Admin | Chi tiết ví Fitken và 50 ledger gần nhất của user |
| `POST` | `/admin/consumers/{userId}/fitken/adjust` | Admin | Điều chỉnh số dư Fitken: Body `{ delta, note }` |
| `GET` | `/admin/billing/plans` | Admin | Danh sách tất cả gói cước consumer |
| `POST` | `/admin/billing/plans` | Admin | Tạo gói mới: Body `{ code, name, priceVnd, fitkenAmount, freeshipVouchers, freeshipMaxDiscountVnd, billingPeriodDays, active }` |
| `PUT` | `/admin/billing/plans/{id}` | Admin | Cập nhật gói consumer |
| `DELETE` | `/admin/billing/plans/{id}` | Admin | Xóa gói consumer |

### 2. Nhận thưởng (Rewards)

Múi giờ tính toán: `Asia/Ho_Chi_Minh`.

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
| `GET` | `/products/{productId}/reviews?page=0&size=10` | Public | Danh sách đánh giá: `{ averageRating, totalCount, items: [{ id, rating, content, imageUrls, authorName, verifiedPurchase, createdAt }] }` |
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

### 5. Giỏ hàng & Địa chỉ (Cart & Addresses)

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/cart` | User | Chi tiết giỏ hàng gom nhóm theo brand: `Cart { itemCount, subtotalVnd, groups: [{ brandId, brandName, subtotalVnd, items: [CartItem] }] }` |
| `POST` | `/cart/items` | User | Thêm sản phẩm vào giỏ: Body `{ productId, variantId, quantity }` |
| `PATCH` | `/cart/items/{id}` | User | Sửa số lượng item: Body `{ quantity }` (0 = xóa) |
| `DELETE` | `/cart/items/{id}` | User | Xóa một sản phẩm khỏi giỏ |
| `DELETE` | `/cart` | User | Xóa toàn bộ giỏ hàng |
| `GET` | `/me/addresses` | User | Danh sách địa chỉ nhận hàng của tôi |
| `POST` | `/me/addresses` | User | Thêm địa chỉ mới: Body `{ recipientName, phone, province, district, ward, street, isDefault }` |
| `PUT` | `/me/addresses/{id}` | User | Sửa địa chỉ nhận hàng |
| `DELETE` | `/me/addresses/{id}` | User | Xóa địa chỉ nhận hàng |

### 6. Đơn hàng khách & Vận đơn (Orders & Tracking)

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `POST` | `/orders/preview` | User | Tính toán giá trước khi đặt: Body `{ addressId?, voucherId?, cartItemIds? }` → `{ subtotalVnd, shippingFeeVnd, discountVnd, totalVnd, groups: [...], voucher? }` |
| `POST` | `/orders` | User | Đặt hàng: Body `{ addressId, paymentMethod: COD\|PAYOS, voucherId?, cartItemIds?, note? }` → `{ order: OrderDetail, checkoutUrl?, mockPaid }` |
| `GET` | `/orders?status=` | User | Danh sách đơn hàng của tôi |
| `GET` | `/orders/{id}` | User | Chi tiết đơn khách, bao gồm các đơn con seller (`sellerOrders`), thông tin vận đơn và `refundDueVnd` (tiền sẽ hoàn cho phần đơn seller đã hủy sau khi thanh toán) |
| `POST` | `/orders/{id}/cancel` | User | Hủy đơn: Body `{ reason }` (chỉ khi chưa có đơn con nào SHIPPING) |
| `POST` | `/orders/{id}/pay` | User | Tạo lại link thanh toán PayOS cho đơn `PENDING_PAYMENT` |
| `POST` | `/orders/payos/return` | User | Xác nhận PayOS trả về: Body `{ orderCode }` → OrderDetail |
| `GET` | `/orders/{id}/tracking` | User | Hành trình vận đơn: `[{ sellerOrderId, brandName, shipment: { carrier, trackingCode, status, estimatedDeliveryAt, events: [...] } }]` |

Trạng thái:
- `OrderStatus`: `PENDING_PAYMENT` | `CONFIRMED` | `PROCESSING` | `COMPLETED` | `CANCELLED`
- `PaymentStatus`: `UNPAID` | `PAID` | `REFUNDED`
- `SellerOrderStatus`: `PENDING` | `CONFIRMED` | `PACKED` | `SHIPPING` | `DELIVERED` | `CANCELLED` | `RETURNED`
- `ShipmentStatus`: `READY_TO_PICK` | `PICKED_UP` | `IN_TRANSIT` | `OUT_FOR_DELIVERY` | `DELIVERED` | `FAILED` | `RETURNED`

### 7. Seller Portal & Đối soát thương hiệu (Brand Commerce)

Dành cho role `BRAND_OWNER` (dashboard hoàn toàn miễn phí):

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/brand/orders?status=` | Brand | Danh sách đơn seller của brand |
| `GET` | `/brand/orders/{id}` | Brand | Chi tiết đơn seller + địa chỉ giao + vận đơn |
| `POST` | `/brand/orders/{id}/confirm` | Brand | Xác nhận đơn hàng |
| `POST` | `/brand/orders/{id}/pack` | Brand | Đánh dấu đã đóng gói |
| `POST` | `/brand/orders/{id}/cancel` | Brand | Hủy đơn seller: Body `{ reason }` |
| `POST` | `/brand/orders/{id}/ship` | Brand | Xuất kho giao carrier: Body `{ carrier: GHN\|GHTK\|VIETTEL_POST\|SELF, trackingCode? }` |
| `POST` | `/brand/shipments/{id}/events` | Brand | Ghi sự kiện vận đơn thủ công: Body `{ status, description?, location? }` |
| `GET` | `/brand/settlements` | Brand | Danh sách kỳ đối soát doanh thu của brand |
| `GET` | `/brand/settlements/summary` | Brand | Tổng kết đối soát: `{ pendingVnd, eligibleVnd, paidVnd, nextEligibleAt }` |
| `GET` | `/brand/payout-account` | Brand | Thông tin tài khoản ngân hàng nhận tiền |
| `PUT` | `/brand/payout-account` | Brand | Cập nhật tài khoản nhận tiền: Body `{ bankName, bankAccountNumber, bankAccountName }` |
| `GET` | `/brand/sales/summary` | Brand | Thống kê bán hàng 30 ngày qua `{ ordersLast30Days, revenueLast30DaysVnd, deliveredCount, cancelledCount }` |

### 8. Admin Commerce & Đối soát

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/admin/orders?status=` | Admin | Giám sát toàn bộ đơn hàng sàn |
| `GET` | `/admin/orders/{id}` | Admin | Chi tiết đơn hàng toàn sàn |
| `GET` | `/admin/commerce/summary` | Admin | Báo cáo tài chính: `{ gmvVnd, commissionVnd, ordersCount, pendingSettlementVnd }` |
| `GET` | `/admin/settlements?status=&brandId=` | Admin | Danh sách các kỳ đối soát seller |
| `POST` | `/admin/settlements/generate` | Admin | Tạo kỳ đối soát cho các đơn đủ điều kiện (hết 7 ngày hold): Body `{ brandId? }` |
| `POST` | `/admin/settlements/{id}/mark-paid` | Admin | Đánh dấu đã thanh toán kỳ đối soát: Body `{ payoutRef }` |

### 8b. Quản lý tài khoản & Thống kê truy cập

| Method | Path | Auth | Mô tả & Body / Query |
|---|---|---|---|
| `GET` | `/admin/users?q=&role=&status=&page=0&size=20` | Admin | Danh sách tài khoản (không gồm tài khoản đã xóa): `{ items: [{ id, email, displayName, role, status, emailVerified, consumerPlan, fitkenBalance, createdAt, lastActiveDate, brandName, signupSource }], total, page, size, summary: { totalAccounts, consumers, brandOwners, admins, suspended, proUsers } }`. `q` tìm theo email/tên |
| `GET` | `/admin/users/{id}` | Admin | Chi tiết một tài khoản |
| `PATCH` | `/admin/users/{id}/status` | Admin | Khóa/mở khóa: Body `{ status: ACTIVE\|SUSPENDED }`. Không khóa được chính mình hoặc admin khác. Tài khoản bị khóa mất phiên ngay; đăng nhập/refresh → `400 ACCOUNT_LOCKED` |
| `POST` | `/analytics/visit` | Public | Ghi lượt xem trang: Body `{ visitorId (UUID lưu ở localStorage), path? }` → `204`. Bỏ qua bot và tài khoản admin; mỗi trình duyệt = 1 khách/ngày |
| `GET` | `/admin/traffic?days=30` | Admin | Thống kê truy cập (7–90 ngày): `{ today, rangeDays, day, week, month: { visitors, pageViews, newVisitors, previousVisitors, changePct }, daily: [...], weekly: [...], monthly: [...], weekdays: [{ isoDay, avgVisitors }], assessment: { trend, trendChangePct, level, scale, volatility, avgDailyVisitors, recentAvgDailyVisitors, peakDate, peakVisitors, busiestWeekday, returningRate, pagesPerVisit } }` |

### 9. Webhooks

| Method | Path | Auth | Mô tả & Header |
|---|---|---|---|
| `POST` | `/webhooks/payos` | PayOS | Xử lý webhook thanh toán tự động (gói Pro và đơn hàng) |
| `POST` | `/webhooks/logistics` | Partner | Giả lập/nhận cập nhật trạng thái vận chuyển từ hãng: Header `X-Logistics-Token`, Body `{ trackingCode, status, description?, location? }` |

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
- `GET|POST|PUT|DELETE /wardrobe/items`, `POST /wardrobe/items/{id}/image`

### Catalog & Gợi ý phối đồ
- `GET /products`, `GET /products/{id}`, `GET /products/similar`
- `POST /recommendations` — tạo outfit gợi ý
- `GET /recommendations/{id}`, `POST /recommendations/{id}/save`, `GET /recommendations/saved`
- `POST /stylist/chat` — stylist chat tư vấn

### Thử đồ AI (Try-On)
- `POST /try-on/requests`, `POST /try-on/requests/{id}/items`
- `POST /try-on/requests/{id}/generate` — sinh ảnh thử đồ (tốn 1 Fitken nếu chọn mode `USER_PHOTO` hoặc `AVATAR`; `OUTFIT_BOARD_ONLY` miễn phí)
- `GET /try-on/requests/{id}/result`
- `POST /redirects/buy-click` — theo dõi click chuyển hướng ra kênh ngoài (phương án bổ trợ song song mua in-app)
