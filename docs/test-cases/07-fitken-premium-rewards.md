# 07 · Fitken, gói Premium, brand yêu thích & nhận thưởng (FIT / SUB / PREM / PREF / RWD)

[← Mục lục](../TEST_CASES.md)

Gói người dùng **FitMe Pro** đã đổi tên thành **FitMe Premium** (migration V28): mã gói `PRO_MONTHLY` → `PREMIUM_MONTHLY`, giá trị `consumer_plan` PRO / PLUS → PREMIUM (API vẫn đọc được giá trị cũ). Tên "Plus" giờ dành cho gói brand, xem [06-brand-plus-voucher-lead.md](06-brand-plus-voucher-lead.md). Voucher freeship của người dùng (`/me/vouchers`, tab voucher ở `/rewards`) đã gỡ cùng thương mại in-app (V27), nên nhóm VCH-01..05 cũ bị xoá. Tủ đồ chỉ dành cho Premium, xem [08 · WAR](08-wardrobe-gallery-redirect.md).

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Ví Fitken | Tặng **5 Fitken** dùng thử đúng 1 lần (lần đầu chạm ví). Hai quỹ: quỹ gói (mất khi Premium hết hạn) và quỹ thưởng (không hết hạn). Chỉ thử mặc AI tốn Fitken (1 / lần); thử đồ toàn sản phẩm brand Plus có lượt miễn phí (xem PLUS-08) |
| Trần Fitken miễn phí | Cài đặt `fitken.max_balance` "Trần Fitken miễn phí" (mặc định 50, 0–100000, admin sửa ở `/admin/settings`, hiệu lực trong ≤ 1 phút). Chỉ áp cho nguồn miễn phí: tặng dùng thử, điểm danh, chia sẻ, đánh giá. Số cộng = min(thưởng, max(0, trần − số dư)); cộng 0 thì không ghi lịch sử. **Không** áp cho Fitken từ gói Premium, gói nạp, admin điều chỉnh, hoàn Fitken |
| Thông tin trần trong API | Ví trả `maxBalance`, `plan` = FREE / PREMIUM. Điểm danh trả `rewardGranted`, `rewardIntended`, `rewardCapped`, `maxBalance`, `balance`; gửi link chia sẻ trả `rewardIntended`, `rewardCapped`, `maxBalance`; tạo đánh giá trả thêm `rewardGranted`, `rewardIntended`, `rewardCapped`, `maxBalance`, `rewardLimitReached` |
| Gói Premium | `PREMIUM_MONTHLY` "FitMe Premium" 49.000đ / 30 ngày, +15 Fitken vào quỹ gói. Quyền lợi: tùy biến phối đồ theo brand yêu thích, tủ đồ cá nhân và phối kèm đồ có sẵn, Fitken hàng tháng; gợi ý ưu tiên phối cùng brand / brand đối tác (coherence PREFER). Gia hạn khi còn hạn thì cộng dồn từ ngày hết hạn cũ |
| Gói nạp | Hiện **không có gói nạp nào được seed**; admin tạo được gói TOPUP cho người dùng |
| Hết hạn | Job 00:05 hằng ngày (giờ VN): Premium quá hạn → EXPIRED, xoá quỹ gói, về FREE. Brand yêu thích và món tủ đồ được **giữ lại** nhưng không dùng được cho tới khi nâng cấp lại |
| Thanh toán gói | Mock: đánh dấu đã trả ngay khi checkout; live: chỉ webhook ký hợp lệ, `data.code = 00` và đủ số tiền mới đánh dấu đã trả. Đơn PENDING quá 24 giờ (`fitme.billing.pending-expiry-hours`) → EXPIRED, job mỗi 15 phút. Phản hồi checkout: `{orderId, payosOrderCode, checkoutUrl, mockPaid}` |
| Chặn tính năng Premium | Lưu brand yêu thích, mọi API `/api/v1/wardrobe/**`: người dùng Free / khách nhận 403 `PREMIUM_REQUIRED`. Free chọn chế độ tủ đồ khi tư vấn thì tự về `NO_WARDROBE_DATA`. `FITME_CONSUMER_ENTITLEMENT_ENABLED=false` mở mọi tính năng Premium cho tất cả |
| Brand yêu thích | `GET / PUT /api/v1/me/brand-preferences` (cần đăng nhập). Tối đa 10 brand đã duyệt. Chế độ "Đa dạng nhiều brand" (DIVERSE, mặc định): brand yêu thích được cộng điểm nhẹ, luôn thắng ưu tiên brand Plus. "Chỉ brand yêu thích" (FAVORITES_ONLY): lọc cứng, chỉ phối từ brand yêu thích; thiếu món thì trả outfit chưa đầy đủ kèm `notice`, không bổ sung brand khác. Chỉ có tác dụng khi đang Premium |
| Điểm danh | 1 lần / ngày (giờ VN); chuỗi liên tiếp; **+1 Fitken mỗi khi chuỗi chia hết cho 3** (ngày 3, 6, 9…), có áp trần |
| Chia sẻ | +3 Fitken (có áp trần), tối đa 1 lần / ngày; link `https` tới bài viết cụ thể trên facebook.com, fb.watch, tiktok.com, instagram.com, threads.net, x.com, twitter.com; link được chuẩn hoá, **trùng trên toàn hệ thống** bị từ chối; **tự động duyệt**, admin chỉ có thể từ chối (thu hồi đúng số Fitken đã cộng) |
| Admin | Điều chỉnh Fitken −10.000..10.000 (khác 0); "Lên Premium" / "Về Free" (cấp = 30 ngày + 15 Fitken, không thu tiền) |
| Hết Fitken | `FITKEN_INSUFFICIENT` "Bạn đã hết Fitken. Nâng cấp FitMe Premium để nhận Fitken hàng tháng hoặc nhận thưởng để tiếp tục thử đồ AI." |

---

## 7.1 Ví Fitken & trần Fitken miễn phí (FIT)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FIT-01 | H | P0 | Tài khoản vừa xác minh | Mở `/rewards` hoặc xem header | — | Số dư 5 Fitken; lịch sử có dòng "Tặng 5 Fitken dùng thử" | ✅ | — | ❌ | ❌ | `trialFitkenIsGrantedExactlyOnce` |
| FIT-02 | W | P0 | Đã nhận 5 Fitken thử | Gọi ví nhiều lần / song song | — | Không nhận thêm Fitken thử | ✅ | — | — | ❌ | |
| FIT-03 | H | P1 | Có giao dịch | Xem lịch sử | — | Đủ loại giao dịch (tặng, dùng, hoàn, thưởng, admin điều chỉnh), mới nhất trước, 20 dòng / trang | ❌ | — | ❌ | ✅ | |
| FIT-04 | E | P1 | Khách | Gọi `GET /me/fitken` | — | Bị chặn (403) | ✅ | — | — | ✅ | `walletRequiresLogin` |
| FIT-05 | W | P0 | — | Trừ và hoàn Fitken cùng mã tham chiếu 2 lần | — | Chỉ trừ / hoàn 1 lần | ✅ | — | — | — | `consumeAndRefundAreIdempotentPerReference` |
| FIT-06 | E | P1 | Có 2 Fitken quỹ gói + 3 quỹ thưởng | Thử mặc 1 lần | — | Trừ quỹ gói trước | ❌ | — | — | ❌ | |
| FIT-07 | W | P1 | Số dư 0 | Admin điều chỉnh −5 | — | Số dư vẫn 0 (không âm) | ❌ | — | — | ❌ | |
| FIT-08 | H | P1 | — | Số Fitken trên header | — | Khớp số dư ví; bấm vào mở `/rewards` | — | ❌ | ❌ | ✅ | |
| FIT-09 | H | P1 | Số dư 12, trần mặc định | Mở `/rewards`, `/pricing`; gọi `GET /me/fitken` | — | API trả `maxBalance` = 50; UI "12 / 50 Fitken miễn phí" và ghi chú Fitken từ Premium / mua thêm không bị giới hạn | ✅ | ✅ | ❌ | ❌ | `walletAndSummaryExposeTheCap`; `fitken-cap.test` |
| FIT-10 | E | P0 | Số dư 49 | Gửi link chia sẻ hợp lệ; admin từ chối lượt đó | — | Chỉ cộng 1 (`rewardIntended` = 3, `rewardCapped` = true); toast "Ví đã đạt trần 50 Fitken miễn phí nên chỉ cộng 1 Fitken"; từ chối thu hồi đúng 1 | ✅ | ✅ | — | ❌ | `shareRewardIsCappedAndAdminRejectRevokesOnlyWhatWasGranted`; `fitken-cap.test` |
| FIT-11 | E | P1 | Số dư = 50 | Điểm danh ngày thứ 3 của chuỗi | — | Không cộng, không có dòng lịch sử mới; thông báo "Ví đã đầy, không cộng thêm" | ✅ | ✅ | — | ❌ | `freeGrantAtTheCapAddsNothingAndWritesNoLedgerRow`; "says the wallet is full when nothing was credited" |
| FIT-12 | E | P1 | Admin đặt trần = 3 | Tài khoản mới chạm ví lần đầu | — | Nhận 3 Fitken thử thay vì 5 | ✅ | — | — | ❌ | `trialGrantIsCappedToo` |
| FIT-13 | H | P0 | Số dư 50 | Mua Premium (+15); admin điều chỉnh +10 | — | Cộng đủ, số dư 75, vượt trần | ✅ | — | — | ❌ | `paidSubscriptionAndAdminCreditsAreNeverCapped` |
| FIT-14 | H | P2 | — | Kiểm tra danh sách nguồn bị áp trần | — | Chỉ TRIAL_GRANT, CHECKIN_REWARD, SHARE_REWARD, REVIEW_REWARD; hoàn Fitken thử đồ lỗi luôn hoàn đủ | ✅ | — | — | — | `cappedSourcesAreOnlyFreeOnes` |
| FIT-15 | H | P2 | Số dư ≥ trần | Mở `/rewards` | — | "Ví đã đạt trần 50 Fitken miễn phí. Thưởng điểm danh, chia sẻ và đánh giá sẽ tạm dừng cộng cho đến khi bạn dùng bớt Fitken." | — | ✅ | ❌ | ❌ | `fitken-cap.test` (`isAtFreeFitkenCap`) |
| FIT-16 | E | P2 | Số dư 49 | Viết đánh giá có ảnh, đủ 20 ký tự | — | Chỉ cộng 1 Fitken; response `rewardCapped` = true | ❌ | — | — | ❌ | |

## 7.2 Bảng giá & gói Premium (SUB)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SUB-01 | H | P1 | — | Mở `/pricing` (không cần đăng nhập) | — | Tiêu đề "FitMe Free & Premium"; gói Premium 49.000đ/tháng: "Tùy biến phối đồ theo brand yêu thích", "Tủ đồ cá nhân và phối kèm đồ có sẵn", "15 Fitken mỗi tháng để thử đồ AI" | ✅ | ✅ | ✅ | ❌ | `plansArePublic`; `premium.test`; smoke-routes. PROD 04/10 chỉ kiểm tra bản "Pro" trước khi đổi tên |
| SUB-02 | H | P0 | Đăng nhập, gói Free | Bấm "Nâng cấp Premium ngay" → thanh toán PayOS thành công | — | Premium 30 ngày; +15 Fitken; email "FitMe · Gói Premium đã được kích hoạt"; `/billing/return` "Thanh toán thành công!" | ✅ | — | ❌ | ❌ | `mockPremiumCheckoutGrantsFitken`, `premiumCheckout_sendsPlanPurchasedEmail` |
| SUB-03 | E | P1 | — | Huỷ trên trang PayOS | — | `/billing/return`: "Thanh toán đã bị hủy."; gói không đổi | — | ❌ | ❌ | ❌ | |
| SUB-04 | E | P1 | Chế độ live, webhook chưa về | Mở `/billing/return?status=success` | — | Hiện "Đang chờ xác nhận thanh toán", **không** báo thành công khi chưa trả | ❌ | ✅ | — | ❌ | Đã sửa #24 (`d88f285`). Trước đây: Hiện luôn báo "Thanh toán thành công!" khi gọi return thành công |
| SUB-05 | W | P0 | User A | Gọi return với mã đơn gói của B | — | Bị từ chối | ✅ | — | — | ❌ | `returnForSomeoneElsesOrderIsRejected` |
| SUB-06 | H | P1 | Premium còn 10 ngày | Mua thêm 1 tháng | — | Hạn mới = hạn cũ + 30 ngày; +15 Fitken | ❌ | — | — | ❌ | |
| SUB-07 | E | P1 | Premium hết hạn hôm qua | Đợi job 00:05 | — | Trạng thái EXPIRED; quỹ gói về 0 (ghi "EXPIRE_RESET"); quỹ thưởng giữ nguyên; về Free; brand yêu thích và món tủ đồ vẫn còn nhưng bị khoá | ❌ | — | — | ❌ | |
| SUB-08 | H | P1 | Admin tạo gói TOPUP 10 Fitken | Người dùng mua gói nạp | — | +10 Fitken quỹ thưởng (không áp trần); email "FitMe · Đã cộng Fitken vào ví của bạn" | ❌ | — | ❌ | ❌ | Chưa có gói nạp trên prod |
| SUB-09 | E | P2 | Gói đã tắt | Gọi checkout với gói đó | — | "Gói không còn khả dụng"; trang `/pricing` báo "Gói Premium hiện chưa mở bán." khi không có gói đang bán | ❌ | — | — | ❌ | |
| SUB-10 | W | P0 | — | Gửi webhook gói 2 lần | — | Chỉ cộng Fitken 1 lần | ✅ | — | — | ❌ | Unique theo tham chiếu; BE `P0BillingWebhookIntegrationTest#subscriptionWebhookDeliveredTwice_creditsFitkenOnce` |
| SUB-11 | E | P2 | Đơn gói chờ thanh toán quá 24 giờ | Chờ job (≤ 15 phút) | — | Đơn EXPIRED; đơn mới tạo vẫn PENDING | ✅ | — | — | ❌ | Đã sửa #25 (`d88f285`). Trước đây: Trạng thái CANCELLED / EXPIRED của đơn gói không bao giờ được đặt; BE `stalePendingCheckoutsExpireButFreshOnesStayPending` |
| SUB-12 | H | P2 | Người dùng Premium | Xem banner / thẻ nâng cấp ở chat AI, `/pricing` | — | Banner nâng cấp bị ẩn; `/pricing` hiện "Bạn đang dùng Premium" | — | ❌ | ❌ | ❌ | |
| SUB-13 | H | P2 | — | Xem 10 đơn gói gần nhất | — | Danh sách đúng | ❌ | — | — | ❌ | |
| SUB-14 | W | P0 | PayOS live, đơn gói PENDING | Gửi webhook ký hợp lệ nhưng `code` ≠ `00`; rồi webhook thành công | — | Lần 1 không đánh dấu đã trả; lần 2 PAID, cộng Fitken | ✅ | — | — | ❌ | `P0BillingWebhookIntegrationTest#signedFailureWebhook_doesNotMarkOrderPaid_whileSignedSuccessDoes`; thay PAY-08 cũ |
| SUB-15 | W | P0 | PayOS live | Gửi webhook với chữ ký giả | — | Bị từ chối; đơn gói không đổi | ✅ | — | — | ❌ | `P0BillingWebhookIntegrationTest#forgedWebhookSignature_isRejectedAndBillingOrderUnchanged`; thay PAY-07 cũ |
| SUB-16 | E | P1 | PayOS live | Webhook trả tiền với số tiền nhỏ hơn giá gói | — | Đơn không được kích hoạt | ✅ | — | — | ❌ | `webhookActivatesOnlySuccessfulFullPayments` |
| SUB-17 | H | P1 | Khách chưa đăng nhập | Bấm nâng cấp ở `/pricing` | — | "Vui lòng đăng nhập để nâng cấp Premium." | — | ❌ | ❌ | ❌ | |

## 7.3 Quyền lợi Premium (PREM)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PREM-01 | H | P1 | Người dùng Free / khách | `GET /me/entitlement` | — | `plan` FREE, `premium=false`, `coherenceMode` OFF, `label` "FitMe Premium", `upsellMessage` có giá và số Fitken đọc từ gói, `premiumPriceVnd`, `premiumMonthlyFitken` | ✅ | ✅ | — | ❌ | `anonymousUserIsFreeWithOffCoherence`, `upsellMessageReadsPriceAndFitkenFromPlan`; `premium.test` |
| PREM-02 | H | P1 | Người dùng Premium | Tư vấn | — | Coherence PREFER; ưu tiên phối cùng brand / brand đối tác mạnh hơn Free | ✅ | — | — | ❌ | `premiumSubscriberGetsPreferCoherence`, `premiumPreferenceScaleIsStrongerThanFree` |
| PREM-03 | E | P1 | Tài khoản cũ có `consumer_plan` PRO hoặc PLUS | Đăng nhập, xem gói | — | Được coi là PREMIUM | ✅ | — | — | ❌ | `legacyProAndPlusValuesMapToPremium` |
| PREM-04 | E | P1 | Người dùng Free | Ở chat AI chọn "Ưu tiên tủ đồ" / phối tủ đồ + brand | — | Lựa chọn tủ đồ bị khoá (title "Tính năng của FitMe Premium", dòng "Phối kèm đồ trong tủ đồ là tính năng của FitMe Premium. Xem gói Premium"); gọi API vẫn tự về `NO_WARDROBE_DATA` | ✅ | ✅ | — | ❌ | `freeUserWardrobeModesFallBackToBrandOnly` (2 class); `wardrobe-mode.test` |
| PREM-05 | H | P1 | Người dùng Premium có món tủ đồ | Tư vấn với chế độ tủ đồ | — | Giữ chế độ đã chọn, outfit có món tủ đồ | ✅ | — | ✅ | ❌ | `premiumUserKeepsWardrobeMode`; wardrobe.spec, role-flows (đăng nhập tài khoản Premium) |
| PREM-06 | E | P2 | `FITME_CONSUMER_ENTITLEMENT_ENABLED=false` | Free dùng tủ đồ, lưu brand yêu thích | — | Được phép như Premium | ✅ | — | — | — | `disabledEntitlementsOpenPremiumFeaturesToEveryone` |
| PREM-07 | E | P1 | Người dùng Free | Gọi API Premium (lưu brand yêu thích, tủ đồ) | — | 403 `PREMIUM_REQUIRED`; FE hiện "Tính năng này dành cho FitMe Premium. Nâng cấp tại trang Bảng giá để sử dụng." hoặc thông báo riêng của API | ✅ | ✅ | — | ❌ | `anonymousCallerIsRejectedForPremiumFeature`; `user-error-message.test` |
| PREM-08 | H | P2 | Người dùng Free | Xem banner Premium ở `/ai/chat` → "Nâng cấp Premium" | — | Mở `/pricing` | — | ❌ | ❌ | ❌ | |

## 7.4 Brand yêu thích (PREF)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PREF-01 | H | P1 | Người dùng Premium | `/profile/style-preferences` → chọn 3 brand, "Chỉ brand yêu thích" → "Lưu brand yêu thích" | — | Toast "Đã lưu brand yêu thích"; tải lại vẫn đúng; bộ đếm "Brand yêu thích (3/10)" | ✅ | ✅ | ❌ | ❌ | `premiumUserSavesValidatedBrandPreferences`; `brand-preference-api.test` |
| PREF-02 | E | P1 | Người dùng Free | Mở trang | — | Thẻ "Tính năng của FitMe Premium" + nút nâng cấp; xem được lựa chọn hiện tại nhưng không lưu được (403 `PREMIUM_REQUIRED` "Tùy biến phối đồ theo brand yêu thích là tính năng của FitMe Premium") | ✅ | ❌ | ❌ | ❌ | `freeUserCanReadButNotSaveBrandPreferences` |
| PREF-03 | E | P1 | Premium | Chọn brand thứ 11 | — | UI không cho chọn thêm; API "Chỉ được chọn tối đa 10 brand yêu thích" | ❌ | ✅ | — | ❌ | `toggleFavoriteBrand` / `validateBrandPreferences` |
| PREF-04 | E | P1 | Premium | Chọn "Chỉ brand yêu thích" khi chưa chọn brand nào | — | FE "Chọn ít nhất 1 brand để dùng chế độ chỉ brand yêu thích"; API "Chọn ít nhất 1 brand yêu thích để dùng chế độ chỉ brand yêu thích" | ✅ | ✅ | — | ❌ | `premiumUserSavesValidatedBrandPreferences` |
| PREF-05 | W | P1 | Premium | Gửi `brandIds` có brand chờ duyệt / không tồn tại; thiếu `mode` | — | 400 `BRAND_PREFERENCE_INVALID` "Brand đã chọn không tồn tại hoặc chưa được duyệt" / "Vui lòng chọn chế độ phối đồ" | ✅ | — | — | ❌ | Như trên |
| PREF-06 | H | P1 | Premium, "Chỉ brand yêu thích", đủ sản phẩm | Tư vấn | — | Outfit chỉ gồm sản phẩm brand yêu thích | ✅ | — | ❌ | ❌ | `favoritesOnlyRanksOutfitsFromFavoriteBrands`, `favoriteBrandBonus_favoritesOnlyBoostsFavoritesAndPenalizesOthers` |
| PREF-07 | E | P1 | Premium, "Chỉ brand yêu thích", brand yêu thích thiếu món (vd. không có giày) | Tư vấn | — | Không lấy món từ brand khác; trả outfit chưa đầy đủ (hoặc rỗng) kèm `notice` giải thích, chat hiển thị notice | ❌ | — | — | ❌ | |
| PREF-08 | H | P2 | Premium, "Đa dạng nhiều brand" | Tư vấn | — | Brand yêu thích được ưu tiên nhẹ, vẫn phối cùng brand khác | ✅ | — | — | ❌ | `favoriteBrandBonus_diverseGivesSmallBoostOnly` |
| PREF-09 | E | P1 | Đã lưu brand yêu thích khi còn Premium, nay hết hạn | Tư vấn | — | Brand yêu thích không ảnh hưởng xếp hạng; dữ liệu vẫn giữ, nâng cấp lại thì dùng tiếp | ✅ | — | — | ❌ | `freeUserFavoritesNeverReachScoring` |
| PREF-10 | E | P2 | Chưa chọn brand nào | Tư vấn | — | Không cộng / trừ điểm theo brand | ✅ | — | — | ❌ | `favoriteBrandBonus_noFavoritesMeansNoEffect` |
| PREF-11 | E | P1 | Khách chưa đăng nhập | Gọi `GET /me/brand-preferences` | — | 403 | ❌ | — | — | ❌ | |
| PREF-12 | W | P1 | Premium có brand yêu thích | Xoá "Toàn bộ tài khoản" hoặc dữ liệu hồ sơ phong cách | — | Brand yêu thích bị xoá, chế độ về "Đa dạng nhiều brand" | ❌ | — | — | ❌ | `UserDataEraser.eraseStyleProfile` |

## 7.5 Điểm danh hằng ngày (RWD-CHK)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RWD-CHK-01 | H | P1 | Chưa điểm danh hôm nay | Bấm điểm danh | — | Chuỗi +1; dải 7 ngày cập nhật | ❌ | — | ❌ | ❌ | |
| RWD-CHK-02 | H | P1 | Đã điểm danh 2 ngày liên tiếp | Điểm danh ngày 3 | — | +1 Fitken ("CHECKIN_REWARD") | ✅ | — | ❌ | ❌ | `thirdConsecutiveCheckinGrantsReward` |
| RWD-CHK-03 | H | P2 | Chuỗi 5 | Điểm danh ngày 6 | — | +1 Fitken | ❌ | — | — | ❌ | |
| RWD-CHK-04 | E | P1 | Đã điểm danh hôm nay | Bấm lần nữa | — | "Hôm nay bạn đã điểm danh rồi, quay lại vào ngày mai nhé!" | ❌ | — | ❌ | ❌ | |
| RWD-CHK-05 | E | P1 | Chuỗi 2, bỏ 1 ngày | Điểm danh | — | Chuỗi về 1 | ❌ | — | — | ❌ | |
| RWD-CHK-06 | W | P1 | — | Điểm danh 23:59 rồi 00:01 (giờ VN) | — | Tính là 2 ngày liên tiếp | ❌ | — | — | ❌ | |
| RWD-CHK-07 | W | P1 | — | Gửi 2 request điểm danh song song | — | Chỉ 1 thành công (khoá duy nhất) | ❌ | — | — | ❌ | |
| RWD-CHK-08 | E | P1 | Khách | Mở `/rewards`, gọi API | — | Yêu cầu đăng nhập | ✅ | — | ❌ | ❌ | `rewardsRequireLogin` |

## 7.6 Thưởng chia sẻ (RWD-SHR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RWD-SHR-01 | H | P0 | Chưa được thưởng chia sẻ hôm nay, số dư dưới trần | Dán link bài đăng, gửi | `https://www.facebook.com/user/posts/123` | +3 Fitken ngay; trạng thái "Đã duyệt" | ✅ | — | ❌ | ❌ | `shareRewardRespectsDailyLimit…` |
| RWD-SHR-02 | E | P1 | Đã được thưởng hôm nay | Gửi link khác | — | `SHARE_DAILY_LIMIT` | ✅ | — | ❌ | ❌ | |
| RWD-SHR-03 | E | P1 | Link đã được ai đó dùng | Gửi lại link (biến thể `m.`, `?fbclid=…`, `/` cuối) | `https://m.facebook.com/user/posts/123/?fbclid=x` | "Link bài đăng này đã được dùng để nhận thưởng" | ✅ | — | ❌ | ❌ | Chuẩn hoá link |
| RWD-SHR-04 | E | P1 | — | Link sai | `http://facebook.com/x`, `https://google.com/a`, `https://facebook.com/`, `https://user:pw@facebook.com/p` | `SHARE_INVALID_URL` | ✅ | — | ❌ | ❌ | `shareUrlValidation` |
| RWD-SHR-05 | H | P2 | — | Link TikTok, Instagram, Threads, X | — | Được chấp nhận | ✅ | — | — | ❌ | |
| RWD-SHR-06 | E | P2 | — | Link > 1000 ký tự | — | Bị từ chối | ❌ | — | — | ❌ | |
| RWD-SHR-07 | W | P1 | — | Gửi kèm `galleryImageId` của người khác | — | Bị từ chối | ❌ | — | — | ❌ | |
| RWD-SHR-08 | H | P1 | Từ thư viện ảnh | Bấm "Dán link nhận thưởng" | — | Mở `/rewards?galleryImageId=…` với ảnh đã gắn | — | ❌ | ❌ | ❌ | |
| RWD-SHR-09 | H | P1 | Admin | `/admin/rewards` → từ chối 1 lượt chia sẻ | `Bài đăng đã bị xoá` | Trạng thái "Đã từ chối"; thu hồi đúng số Fitken đã cộng | ✅ | — | ❌ | ❌ | Xem FIT-10 khi lượt đó bị áp trần |
| RWD-SHR-10 | E | P2 | — | Toast sau khi gửi | — | Báo đã cộng Fitken (hoặc thông báo trần nếu bị giới hạn) | — | ✅ | ❌ | ❌ | Đã sửa #45 (`73e0fc9`). Trước đây: Toast ghi "Admin sẽ duyệt và cộng Fitken sớm nhé!" trong khi đã cộng ngay |
| RWD-SHR-11 | W | P1 | — | Gửi link bài đăng giả (bài không tồn tại) | — | Ghi nhận: hệ thống không xác minh bài đăng, phụ thuộc admin kiểm tra | ❌ | — | — | ❌ | Rủi ro gian lận Fitken; trần Fitken miễn phí giới hạn thiệt hại |
| RWD-SHR-12 | W | P2 | — | Gửi 2 link khác nhau song song | — | Chỉ 1 được thưởng | ❌ | — | — | ❌ | |
