# FitMe AI — Chuyển đổi B2B2C → B2C (hợp đồng triển khai)

Tài liệu này là **nguồn sự thật** cho đợt chuyển đổi mô hình kinh doanh. Mọi thay đổi backend/frontend
phải bám đúng tên bảng, endpoint, DTO và quy tắc dưới đây.

## 1. Quyết định nghiệp vụ

| Hạng mục | Trước (B2B2C) | Sau (B2C) |
|---|---|---|
| Ai trả tiền | Brand mua gói Starter/Growth/Pro + top-up lượt try-on | **Người dùng** mua gói **FitMe Pro 49.000đ/tháng** |
| Đơn vị tính | Quota lượt try-on của brand | **Fitken** của người dùng — 1 Fitken = 1 lượt dùng AI (thử đồ AI) |
| Quyền lợi Pro | — | 15 Fitken/tháng + **2 voucher freeship**/tháng + cá nhân hóa sâu (coherence PREFER/STRICT như Plus cũ) |
| Dùng thử | — | Tài khoản mới được tặng **5 Fitken** một lần (ví được tạo lần đầu) |
| Nhận thưởng | — | Điểm danh đủ chuỗi 3 ngày liên tiếp → +1 Fitken; chia sẻ bài đăng lên trang cá nhân → +2 Fitken; viết đánh giá sản phẩm **có ảnh** → +3 Fitken |
| Dashboard brand | Khóa theo gói brand | **Luôn mở** cho brand đã duyệt (APPROVED) |
| Mua hàng | Redirect sang Shopee/TikTok | **Giỏ hàng + đặt hàng trong app** (COD hoặc PayOS), đối soát cho seller, quản lý vận đơn. Link ngoài vẫn giữ làm phương án phụ |

### 1.1 Quy tắc Fitken
- Ví gồm 2 ngăn: `subscription_remaining` (Fitken từ gói Pro, **reset về 0 khi gói hết hạn**) và `bonus_remaining`
  (dùng thử + thưởng + admin, **không hết hạn**). Tiêu ngăn subscription trước, rồi đến bonus.
- Ví được tạo lười (lazy) lần đầu người dùng đã đăng nhập truy cập ví hoặc dùng AI; khi tạo sẽ ghi `TRIAL_GRANT +5`
  đúng **một lần** (`trial_granted_at`).
- **Tác vụ tốn Fitken**: tạo ảnh thử đồ ở chế độ `USER_PHOTO` hoặc `AVATAR` (`POST /api/v1/try-on/{id}/generate`).
  `OUTFIT_BOARD_ONLY` (bảng phối minh họa, không AI) miễn phí. Stylist chat / gợi ý outfit vẫn miễn phí.
- Chế độ AI bắt buộc đăng nhập. Khách vãng lai gọi generate AI → `400` với `errorCode=LOGIN_REQUIRED`.
- Hết Fitken → `400`, `errorCode=FITKEN_INSUFFICIENT`, message tiếng Việt gợi ý mua Pro / nhận thưởng.
- Kiểm tra đủ Fitken trước khi generate; **trừ ngay sau khi provider nhận job** (hoặc ảnh AI đồng bộ thành công),
  trong cùng transaction, tham chiếu theo `preview_generation_id` (unique → idempotent). Trừ sau lời gọi provider để
  khóa dòng ví không kéo dài suốt request HTTP. Lỗi lúc gửi job / phải dùng ảnh fallback minh họa → **không trừ**.
  Job đã nhận nhưng thất bại khi poll → hoàn lại (`REFUND +1`, idempotent theo cùng reference).
- Ảnh fallback minh họa (khi VTON lỗi) **không** được lưu vào thư viện ảnh của người dùng.
- Gói Pro: thanh toán qua PayOS (mock trong dev/test). Thanh toán thành công → subscription ACTIVE 30 ngày (gia hạn
  cộng dồn từ `expires_at` nếu còn hạn), `+15` vào ngăn subscription, phát 2 voucher FREESHIP (tối đa 30.000đ/voucher,
  hết hạn cùng gói). Job hằng ngày chuyển subscription quá hạn → EXPIRED và reset ngăn subscription (`EXPIRE_RESET`).
- `ConsumerPlan` đổi `PLUS` → **`PRO`** (migrate dữ liệu). Plan của user = PRO khi có subscription ACTIVE còn hạn
  (cột `user_accounts.consumer_plan` được đồng bộ để code cũ đọc vẫn đúng).
- Bỏ endpoint tự bật gói `PUT /api/v1/me/entitlement` (không còn bật Pro miễn phí). Admin vẫn gán Pro thủ công.

### 1.2 Quy tắc nhận thưởng (múi giờ Asia/Ho_Chi_Minh)
- **Điểm danh**: tối đa 1 lần/ngày. `streak` = số ngày liên tiếp tính đến hôm nay. Mỗi khi `streak % 3 == 0`
  → +1 Fitken (`CHECKIN_REWARD`). Lỡ 1 ngày → streak về 1.
- **Chia sẻ bài đăng**: người dùng dán link bài đăng công khai trên trang cá nhân (facebook.com, fb.watch,
  tiktok.com, instagram.com, threads.net, x.com/twitter.com). Validate URL https + domain whitelist, `post_url`
  unique toàn hệ thống, tối đa `share-daily-limit` (mặc định 1) lần được thưởng/ngày → +2 Fitken (`SHARE_REWARD`).
  Admin có thể từ chối (REJECTED) → thu hồi Fitken (`ADMIN_ADJUST` âm, không để số dư âm).
- **Đánh giá có ảnh**: mỗi user 1 đánh giá/sản phẩm; được thưởng +3 (`REVIEW_REWARD`) khi có ≥1 ảnh và nội dung
  ≥ 20 ký tự; chỉ thưởng một lần cho mỗi đánh giá. Đánh giá bị admin ẩn vẫn giữ thưởng trừ khi admin thu hồi.

### 1.3 Thương mại điện tử
- Brand = **Seller**. Một đơn khách (`orders`) tách thành nhiều **đơn seller** (`seller_orders`), mỗi brand một đơn,
  mỗi đơn seller có một **vận đơn** (`shipments`).
- Phí ship mặc định 30.000đ / đơn seller. Voucher FREESHIP áp cho cả đơn khách: giảm `min(tổng phí ship, max_discount)`.
- Tồn kho theo biến thể (`product_variants.stock_quantity`). Trừ tồn khi đặt hàng, hoàn tồn khi hủy / quá hạn thanh toán.
- Thanh toán: `COD` (thu tiền khi giao — đơn được xác nhận ngay, payment PAID khi giao thành công) hoặc `PAYOS`
  (đơn `PENDING_PAYMENT`, quá `payment-timeout-minutes` chưa trả → tự hủy, hoàn tồn, trả voucher).
- Hoa hồng nền tảng `commission-rate` (10%) trên subtotal đơn seller. `payout = subtotal − commission`
  (phí ship do nền tảng thu và trả hãng vận chuyển).
- Đối soát: đơn seller `DELIVERED` quá `settlement-hold-days` (7 ngày, thời gian đổi trả) và chưa thuộc kỳ đối soát
  → đủ điều kiện. Admin tạo kỳ đối soát cho từng brand → `seller_settlements` PENDING → admin đánh dấu PAID
  (kèm mã giao dịch chuyển khoản).
- Vận đơn: carrier `GHN | GHTK | VIETTEL_POST | SELF`. Mã vận đơn tự sinh nếu seller không nhập. Cập nhật trạng thái
  qua seller portal hoặc webhook giả lập hãng vận chuyển `POST /api/v1/webhooks/logistics` (header
  `X-Logistics-Token`). Mỗi lần đổi trạng thái ghi `shipment_events` (timeline tracking cho khách).

## 2. Migration (Flyway)

| Version | Chủ sở hữu | Nội dung |
|---|---|---|
| V17__user_vouchers.sql | (đã có) | `user_vouchers` |
| V18__b2c_fitken.sql | Backend B2C core | Drop bảng billing brand, chuyển `billing_plans` sang gói consumer, ví/ledger Fitken, subscription + order consumer, điểm danh, chia sẻ, đánh giá, thư viện ảnh |
| V19__commerce.sql | Backend Commerce | tồn kho, địa chỉ, giỏ hàng, đơn hàng, thanh toán, vận đơn, đối soát, tài khoản nhận tiền seller |

Không sửa migration cũ (V1–V16).

## 3. Hợp đồng API

Tất cả response bọc `ApiResponse { success, data, error, errorCode? }`. `errorCode` chỉ có khi lỗi nghiệp vụ cần
phân nhánh ở frontend.

### 3.1 Fitken & gói Pro (Backend B2C core)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/me/fitken` | user | `{ balance, subscriptionRemaining, bonusRemaining, trialGranted, tryOnCost, plan: FREE\|PRO, subscription: { planId, planName, status, startsAt, expiresAt } \| null }` |
| GET | `/api/v1/me/fitken/ledger?page=0&size=20` | user | Trang lịch sử `{ items: [{ id, entryType, delta, balanceAfter, note, createdAt }], page, size, total }` |
| GET | `/api/v1/plans` | public | Gói consumer đang bán `[{ id, code, name, priceVnd, fitkenAmount, freeshipVouchers, freeshipMaxDiscountVnd, billingPeriodDays }]` |
| POST | `/api/v1/me/subscription/checkout` | user | body `{ planId }` → `{ orderId, payosOrderCode, checkoutUrl, mockPaid }` |
| POST | `/api/v1/me/subscription/return` | user | body `{ orderCode }` → trạng thái đơn `{ orderId, status, paidAt }`; khi PayOS mock thì đánh dấu PAID tại đây |
| GET | `/api/v1/me/subscription/orders` | user | 10 đơn gần nhất |
| GET | `/api/v1/me/entitlement` | public | Giữ nguyên shape cũ; `plan` = FREE\|PRO, `plus` → đổi tên `pro` (giữ thêm `plus` cùng giá trị để tương thích), label "FitMe Pro" |
| GET | `/api/v1/me/vouchers` | user | (đã có) danh sách voucher |
| GET | `/api/v1/admin/consumers/{userId}/fitken` | admin | ví + 50 ledger gần nhất |
| POST | `/api/v1/admin/consumers/{userId}/fitken/adjust` | admin | `{ delta, note }` |
| PUT | `/api/v1/me/entitlement/users/{userId}` | admin | giữ — gán/hủy Pro thủ công (tạo subscription 30 ngày không qua thanh toán) |
| GET/POST/PUT | `/api/v1/admin/billing/plans...` | admin | giữ CRUD gói nhưng là gói consumer (`fitkenAmount`, `freeshipVouchers`, ...) |

Bỏ: `/api/v1/brand/billing/**`, `/api/v1/admin/billing/brands/**`, `PUT /api/v1/me/entitlement` (self).

### 3.2 Nhận thưởng (Backend B2C core)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/rewards` | `{ balance, checkin: { checkedInToday, currentStreak, streakTarget, daysUntilNextReward, rewardAmount, recentDays: ["2026-10-01", ...] }, share: { rewardAmount, dailyLimit, remainingToday, allowedDomains: [...], recentClaims: [ShareClaim] }, review: { rewardAmount, minContentLength, rewardedCount } }` |
| POST | `/api/v1/rewards/checkin` | `{ checkedInToday: true, currentStreak, rewardGranted, balance }` — gọi lại trong ngày → `400 errorCode=ALREADY_CHECKED_IN` |
| POST | `/api/v1/rewards/share` | body `{ postUrl, tryOnRequestId?, galleryImageId? }` → `ShareClaim { id, postUrl, platform, status, rewardGranted, createdAt }`; lỗi: `SHARE_INVALID_URL`, `SHARE_DUPLICATE`, `SHARE_DAILY_LIMIT` |
| GET | `/api/v1/rewards/share` | lịch sử chia sẻ của tôi |
| GET | `/api/v1/admin/rewards/shares?status=` | admin duyệt link |
| POST | `/api/v1/admin/rewards/shares/{id}/reject` | `{ note }` — thu hồi thưởng |

### 3.3 Đánh giá sản phẩm (Backend B2C core)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/products/{productId}/reviews?page=0&size=10` | public | `{ averageRating, totalCount, items: [{ id, rating, content, imageUrls, authorName, verifiedPurchase, createdAt }] }` |
| POST | `/api/v1/products/{productId}/reviews` | user | body `{ rating (1-5), content, imageUrls: [] }` → `{ review, rewardGranted }`; trùng → `400 errorCode=REVIEW_EXISTS` |
| POST | `/api/v1/reviews/images` | user | multipart `file` → `{ url }` (dùng `ImageUploadValidator` + `StorageService`) |
| GET | `/api/v1/admin/reviews?status=` / POST `/api/v1/admin/reviews/{id}/hide` | admin | kiểm duyệt |

`verifiedPurchase` = user có đơn seller DELIVERED chứa sản phẩm (đọc bảng `order_items`/`seller_orders` của Commerce
qua native query; nếu bảng chưa tồn tại thì false).

### 3.4 Thư viện ảnh phối đồ (Backend B2C core)
- Bảng `outfit_gallery_images`: tự động lưu mỗi lần try-on **hoàn tất có ảnh** (mọi preview mode) cho user đã đăng nhập
  (unique theo `preview_generation_id`). Chỉ lưu URL đã được persist vào storage (R2/local), không lưu URL tạm của provider.
- Khi khách vãng lai đăng nhập và session được link (`SessionService` link), ảnh try-on của session được gán vào user.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/me/gallery?page=0&size=24` | `{ items: [{ id, imageUrl, tryOnRequestId, previewSource, products: [{ productId, name, imageUrl, price }], createdAt }], page, size, total }` |
| DELETE | `/api/v1/me/gallery/{id}` | xóa mềm khỏi thư viện (ảnh trong storage xóa khi user yêu cầu xóa dữ liệu) |
| GET | `/api/v1/admin/gallery/stats` | `{ totalImages, imagesLast7Days, usersWithImages }` |

### 3.5 Giỏ hàng & đơn hàng (Backend Commerce)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/cart` | `Cart { itemCount, subtotalVnd, groups: [{ brandId, brandName, subtotalVnd, items: [CartItem] }] }`, `CartItem { id, productId, variantId, name, imageUrl, colorName, sizeLabel, unitPriceVnd, quantity, lineTotalVnd, stockQuantity, available }` |
| POST | `/api/v1/cart/items` | `{ productId, variantId, quantity }` (cộng dồn nếu đã có) |
| PATCH | `/api/v1/cart/items/{itemId}` | `{ quantity }` (0 = xóa) |
| DELETE | `/api/v1/cart/items/{itemId}` · DELETE `/api/v1/cart` | xóa dòng / xóa giỏ |
| GET/POST/PUT/DELETE | `/api/v1/me/addresses[/{id}]` | `Address { id, recipientName, phone, province, district, ward, street, isDefault }` |
| POST | `/api/v1/orders/preview` | `{ addressId?, voucherId?, cartItemIds? }` → `{ subtotalVnd, shippingFeeVnd, discountVnd, totalVnd, groups: [{ brandId, brandName, subtotalVnd, shippingFeeVnd, items: [CartItem] }], voucher: { id, voucherType, maxDiscountVnd }? }` |
| POST | `/api/v1/orders` | `{ addressId, paymentMethod: COD\|PAYOS, voucherId?, cartItemIds?, note? }` → `{ order: OrderDetail, checkoutUrl?, mockPaid }` (xóa các dòng giỏ đã đặt) |
| GET | `/api/v1/orders?status=` | `[OrderSummary { id, orderCode, status, paymentMethod, paymentStatus, totalVnd, itemCount, firstItemImageUrl, createdAt }]` |
| GET | `/api/v1/orders/{id}` | `OrderDetail { ...summary, subtotalVnd, shippingFeeVnd, discountVnd, refundDueVnd, address, note, sellerOrders: [{ id, brandId, brandName, status, subtotalVnd, shippingFeeVnd, items: [OrderItem], shipment: Shipment? }] }` |
| POST | `/api/v1/orders/{id}/cancel` | `{ reason }` — chỉ khi chưa có đơn seller nào SHIPPING |
| POST | `/api/v1/orders/{id}/pay` | tạo lại link PayOS cho đơn PENDING_PAYMENT |
| POST | `/api/v1/orders/payos/return` | `{ orderCode }` → OrderDetail (mock: đánh dấu PAID) |
| GET | `/api/v1/orders/{id}/tracking` | `[ { sellerOrderId, brandName, shipment: { carrier, trackingCode, status, estimatedDeliveryAt, events: [{ status, description, location, occurredAt }] } } ]` |

Trạng thái: `OrderStatus = PENDING_PAYMENT | CONFIRMED | PROCESSING | COMPLETED | CANCELLED`;
`PaymentStatus = UNPAID | PAID | REFUNDED`;
`SellerOrderStatus = PENDING | CONFIRMED | PACKED | SHIPPING | DELIVERED | CANCELLED | RETURNED`;
`ShipmentStatus = READY_TO_PICK | PICKED_UP | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED | FAILED | RETURNED`.

Webhook PayOS đến muộn cho đơn đã tự hủy vì quá hạn thanh toán: đơn giữ `CANCELLED` (không khôi phục tồn kho/voucher),
`paymentStatus` chuyển `PAID` + log WARN → đơn `CANCELLED` + `PAID` trong `/admin/orders` cần admin hoàn tiền thủ công.

`refundDueVnd` (cột `orders.refund_due_vnd`, V20): phần tiền đã thu qua PayOS thuộc về các đơn seller đã hủy, admin
hoàn thủ công. Tính lại mỗi khi đơn đã `PAID` có seller hủy, khi hủy cả đơn, và khi webhook PayOS đến:
`refundDue = totalVnd − (Σ subtotal + Σ ship của đơn seller còn hiệu lực − min(discountVnd, Σ ship còn lại))`.
Hủy toàn bộ → `refundDueVnd = totalVnd`. Đơn chưa thanh toán (COD/UNPAID) luôn `0`.

### 3.6 Seller portal & admin (Backend Commerce)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/brand/orders?status=` | đơn seller của brand đang đăng nhập |
| GET | `/api/v1/brand/orders/{sellerOrderId}` | `SellerOrderDetail { id, orderId, orderCode, brandId, brandName, status, paymentMethod, paymentStatus, subtotalVnd, shippingFeeVnd, commissionVnd, payoutVnd, note, cancelReason, createdAt, address, items, shipment? }` — chỉ đơn seller của brand mình (brand khác → 403) |
| POST | `/api/v1/brand/orders/{id}/confirm` · `/pack` · `/cancel` (`{ reason }`) | chuyển trạng thái → `SellerOrderDetail` |
| POST | `/api/v1/brand/orders/{id}/ship` | `{ carrier, trackingCode? }` → tạo shipment READY_TO_PICK, đơn seller SHIPPING |
| POST | `/api/v1/brand/shipments/{shipmentId}/events` | `{ status, description?, location? }` |
| GET | `/api/v1/brand/settlements` | `[Settlement { id, brandId, brandName, status, subtotalVnd, commissionVnd, payoutVnd, orderCount, payoutRef, paidAt, createdAt }]` |
| GET | `/api/v1/brand/settlements/summary` | `{ pendingVnd (đang giữ), eligibleVnd (chờ đối soát), paidVnd, nextEligibleAt }` |
| GET/PUT | `/api/v1/brand/payout-account` | `{ bankName, bankAccountNumber, bankAccountName }` |
| GET | `/api/v1/brand/sales/summary` | `{ ordersLast30Days, revenueLast30DaysVnd, deliveredCount, cancelledCount }` (bổ sung cho dashboard) |
| POST | `/api/v1/webhooks/logistics` | `{ trackingCode, status, description?, location? }` header `X-Logistics-Token` |
| GET | `/api/v1/admin/orders?status=` · `/api/v1/admin/orders/{id}` | giám sát đơn |
| GET | `/api/v1/admin/commerce/summary` | `{ gmvVnd, commissionVnd, ordersCount, pendingSettlementVnd }` |
| GET | `/api/v1/admin/settlements?status=&brandId=` | `[Settlement]` |
| POST | `/api/v1/admin/settlements/generate` | `{ brandId? }` → `[Settlement]` tạo cho đơn đủ điều kiện |
| POST | `/api/v1/admin/settlements/{id}/mark-paid` | `{ payoutRef }` → `Settlement` (chỉ từ PENDING, ngược lại 400 `INVALID_STATUS_TRANSITION`) |

## 4. Hạ tầng dùng chung (đã có sẵn — không đổi chữ ký)
- `PayOsClient.createPaymentLink(orderCode, amount, description, returnUrl, cancelUrl)`.
- `PayOsWebhookHandler` — mỗi luồng thanh toán (gói Pro, đơn hàng) là một bean; `PayOsWebhookController` hỏi lần lượt.
  Mã `payos_order_code` phải unique toàn cục: sinh bằng `System.currentTimeMillis() % 9_000_000_000L * 10 + rand(10)`
  và kiểm tra trùng trong bảng của mình.
- `VoucherService` (`com.fitme.voucher`): `grantFreeship`, `reserveForOrder`, `markUsedForOrder`, `releaseForOrder`.
- `BusinessException(message, code)` → `ApiResponse.errorCode`.
- `FitMeProperties.fitken.*`, `FitMeProperties.commerce.*`,
  `FitMeProperties.payos.{subscriptionReturnUrl, subscriptionCancelUrl, orderReturnUrl, orderCancelUrl}`.

## 5. Frontend (route mới)
| Route | Mô tả |
|---|---|
| `/pricing` | Free (5 Fitken dùng thử) vs **Pro 49k/tháng** (15 Fitken + 2 freeship) → checkout PayOS |
| `/billing/return` | Trang trả về sau PayOS gói Pro |
| `/rewards` | Trang **Nhận thưởng**: số dư Fitken, điểm danh (lịch 7 ngày + chuỗi 3 ngày), dán link bài đăng, nhắc viết đánh giá có ảnh, lịch sử Fitken |
| `/profile/gallery` | Thư viện ảnh phối đồ (lưới ảnh, xem lớn, tải về, chia sẻ, xóa, mua lại sản phẩm trong outfit) |
| `/cart`, `/checkout`, `/orders`, `/orders/[id]`, `/orders/return`, `/profile/addresses` | Mua hàng |
| `/brand/orders`, `/brand/orders/[id]`, `/brand/settlements` | Seller portal (thay mục "Gói & Thanh toán") |
| `/admin/orders`, `/admin/settlements`, `/admin/rewards`, `/admin/reviews` | Admin |

Bỏ: `/brand/billing/**`, `/admin/billing/brands/**`, trạng thái khóa dashboard brand.
