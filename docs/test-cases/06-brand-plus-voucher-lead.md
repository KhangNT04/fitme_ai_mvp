# 06 · Gói Brand Plus, voucher brand, khách quan tâm (BP / BV / PLUS / LEAD / CUS)

[← Mục lục](../TEST_CASES.md)

FitMe không còn bán hàng trong ứng dụng (giỏ hàng, đặt hàng, thanh toán đơn, địa chỉ, đối soát đã gỡ ở migration V27, commit `7ae8d1d`). Mọi nút mua chuyển khách sang cửa hàng của brand (xem [08 · RED](08-wardrobe-gallery-redirect.md)). Niêm yết sản phẩm luôn miễn phí; brand trả phí tuỳ chọn cho **FitMe Brand Plus**. Giao diện trang "Gói Plus", "Khách quan tâm" của brand xem [10-brand-portal.md](10-brand-portal.md); trang admin "Gói dịch vụ", "Voucher brand" xem [11-admin-portal.md](11-admin-portal.md).

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Gói | `BRAND_PLUS` "FitMe Brand Plus", đối tượng BRAND, loại SUBSCRIPTION, 999.000đ / 30 ngày (admin sửa được giá, số ngày, giảm giá). Chỉ BRAND_OWNER của brand đã duyệt gọi được `/api/v1/brand/plan/**`; brand tạm ngưng nhận `BRAND_SUSPENDED`. Gói brand không bao giờ xuất hiện ở `/plans` hay luồng mua của người dùng |
| Thanh toán | PayOS, mã đơn lấy từ sequence chung với đơn gói người dùng. Mock: trang `/brand/plan/return` gọi `GET /brand/plan/orders/{orderCode}`, đơn PENDING được đánh dấu PAID ngay. Live: chỉ webhook ký hợp lệ mới kích hoạt; webhook báo lỗi → FAILED; số tiền webhook nhỏ hơn số tiền đơn → giữ nguyên chưa trả. Webhook trả tiền đến muộn vẫn kích hoạt đơn đã huỷ / hết hạn |
| Đơn chờ | Đơn PENDING quá `fitme.billing.pending-expiry-hours` (mặc định 24 giờ) → EXPIRED, job chạy mỗi 15 phút (chung cho đơn gói người dùng và brand). Huỷ ở PayOS → trang return gọi `POST /orders/{orderCode}/cancel` → CANCELLED |
| Gia hạn | Plus còn hạn: hạn mới = hạn cũ + số ngày của gói. Đã hết hạn: bắt đầu lại từ lúc thanh toán. Mỗi brand 1 dòng `brand_subscriptions` |
| Hết hạn | Quyền lợi tính theo `endsAt` (hết là tắt ngay, không chờ job). Job 00:10 giờ VN chuyển ACTIVE quá hạn sang EXPIRED |
| Giảm giá theo thời gian | Admin đặt `discountPercent` 0–100 và khoảng `discountStartsAt`–`discountEndsAt` (bao gồm biên; bỏ trống = không giới hạn phía đó). Giá = giá niêm yết × (100 − %) / 100, làm tròn HALF_UP tới đồng. Giá sau giảm ≤ 0 bị chặn: "Giá gói sau giảm phải lớn hơn 0đ. Vui lòng liên hệ FitMe để được kích hoạt." |
| Chiến dịch voucher | Admin tạo: % giảm 1–99, số voucher / brand 1–100, số brand tối đa ≥ 1, thời gian hiệu lực, bật / tắt. Migration seed chiến dịch "Brand tiên phong" 50%, 3 voucher / brand, tối đa 5 brand, chưa phát cho ai |
| Phát voucher | Chỉ khi chiến dịch đang bật, đã bắt đầu, chưa kết thúc; chỉ brand APPROVED; brand đã nhận của chiến dịch này bị bỏ qua; vượt số brand còn lại thì từ chối toàn bộ lần phát. Mã dạng `FITME-XXXX-XXXX`; % giảm và hạn dùng (= `validUntil` của chiến dịch) được chụp lại lúc phát |
| Vòng đời voucher | ISSUED (Chưa dùng) → RESERVED (giữ cho đơn chờ thanh toán, khoá dòng) → USED khi đơn PAID. Đơn huỷ / thất bại / hết hạn → trả về ISSUED, hoặc EXPIRED nếu đã quá hạn. Admin thu hồi chỉ khi ISSUED. Job 00:15 giờ VN chuyển voucher quá hạn sang EXPIRED |
| Không cộng dồn | Mỗi lần mua tối đa 1 voucher. So với giảm giá theo thời gian đang chạy: mức lớn hơn được áp; bằng nhau thì áp chương trình. Voucher không được dùng tới vẫn giữ trạng thái ISSUED, kèm `voucherIgnoredReason` |
| Ưu tiên gợi ý | Cài đặt `recommendation.plus_boost` (mặc định 15, 0 = tắt) cộng vào điểm xếp hạng sản phẩm brand Plus trong outfit; sản phẩm tương tự dùng 10% mức đó; gợi ý hoàn thiện set thử đồ và prompt Gemini cũng ưu tiên / đánh dấu sản phẩm Plus. Brand yêu thích của người dùng Premium luôn thắng ưu tiên Plus (xem [07 · PREF](07-fitken-premium-rewards.md)) |
| Thử đồ miễn phí | Cài đặt `tryon.plus_free_daily` (mặc định 3) lượt / người / ngày giờ VN, chỉ khi **mọi** sản phẩm trong lượt thử thuộc brand đang có Plus và người dùng đã đăng nhập. Hết lượt thì trừ Fitken như thường. Một lượt thử hoặc miễn phí hoặc trừ Fitken, không bao giờ cả hai. Lỗi tạo ảnh thì hoàn đúng thứ đã dùng |
| Badge | `plusBrand=true` trên sản phẩm và brand công khai khi brand đang có Plus; FE hiện badge "Brand Plus" (title "Brand đối tác FitMe Brand Plus") |
| Khách quan tâm (lead) | Chỉ tạo khi người mua **đã đăng nhập** và đồng ý `BRAND_LEAD_SHARING` (bản ghi mới nhất có hiệu lực) tại thời điểm bấm mua. Mỗi user × sản phẩm × ngày giờ VN tối đa 1 lead. Lead được tạo cho mọi brand; brand không có Plus chỉ thấy số liệu tổng (`plusRequired=true`) |
| Xác nhận đã bán | Chỉ brand Plus, chỉ lead của brand mình. Tích lại giữ thời điểm đầu; bỏ tích xoá thời điểm. Lead đã bán làm đánh giá của khách cho sản phẩm đó có nhãn "Đã mua hàng" |
| Rút đồng ý / xoá tài khoản | Rút đồng ý: brand không còn thấy tên, email (WITHDRAWN), kể cả lead cũ. Xoá toàn bộ tài khoản: `user_id = NULL`, `anonymized_at` (ANONYMIZED); brand vẫn giữ số đếm |
| Dashboard brand | "Khách" = user đã đăng nhập, hoặc session với khách vãng lai, đếm không trùng. Khách thử đồ 7 / 30 ngày, top 10 sản phẩm được thử (30 ngày), phễu 30 ngày: Khách thử đồ → Khách bấm mua → Đơn brand xác nhận đã bán. Dashboard mở cho mọi brand, không cần Plus |

---

## 6.1 Mua gói Brand Plus (BP-BUY)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BP-BUY-01 | H | P0 | Brand đã duyệt, chưa có Plus, PayOS mock | `/brand/plan` → "Thanh toán" → trang return | — | Đơn PENDING rồi PAID; Plus ACTIVE 30 ngày; trang return "Thanh toán thành công!", "Gói Plus của bạn hoạt động đến dd/MM/yyyy", nút "Về trang Gói Plus" | ✅ | — | ❌ | ❌ | `checkoutCreatesPendingDiscountedOrder_andMockReturnActivatesThirtyDays` |
| BP-BUY-02 | H | P1 | Chưa có Plus | Mở `/brand/plan` | — | Trạng thái "Chưa có gói"; 3 quyền lợi; giá niêm yết 999.000đ / 30 ngày; nút "Thanh toán" | ✅ | — | ✅ | ❌ | `statusShowsListPriceWithoutDiscountAndEffectivePriceInsideWindow`; brand-full chỉ kiểm tra trang tải |
| BP-BUY-03 | E | P1 | Đơn PENDING | Huỷ trên trang PayOS → về `/brand/plan/return?status=cancel` | — | Đơn CANCELLED; "Bạn đã hủy thanh toán. Gói Plus chưa được kích hoạt."; voucher (nếu có) về "Chưa dùng" | ✅ | — | ❌ | ❌ | `cancelledReturnMarksPendingOrderCancelled` |
| BP-BUY-04 | H | P0 | PayOS live, đơn PENDING | PayOS gửi webhook trả tiền ký hợp lệ | — | Đơn PAID; Plus ACTIVE 30 ngày | ✅ | — | — | ❌ | `signedPaidWebhookActivatesThirtyDays` |
| BP-BUY-05 | W | P0 | PayOS live | Gửi webhook trả tiền với chữ ký giả | — | Bị từ chối; đơn vẫn PENDING; Plus không kích hoạt | ✅ | — | — | ❌ | `forgedSignatureIsRejectedAndOrderStaysPending` |
| BP-BUY-06 | W | P0 | Đơn đã PAID | Gửi lại cùng webhook | — | Không cộng thêm 30 ngày lần 2 | ✅ | — | — | ❌ | `duplicateWebhookIsIdempotent` |
| BP-BUY-07 | W | P0 | Đơn PENDING | Webhook báo lỗi → webhook trả thiếu tiền → webhook trả đủ | — | Lần 1: FAILED, voucher trả lại; lần 2: không kích hoạt; lần 3: PAID, Plus kích hoạt | ✅ | — | — | ❌ | `failedThenShortThenFullPayment` |
| BP-BUY-08 | W | P0 | Brand A, đơn của brand B | `GET` / `POST cancel` `/brand/plan/orders/{orderCode của B}` | — | 404 "Đơn thanh toán không tồn tại"; đơn của B không đổi | ✅ | — | — | ❌ | `brandCannotReadOrCancelAnotherBrandsOrder` |
| BP-BUY-09 | E | P1 | Admin tắt gói BRAND_PLUS | Mở `/brand/plan`; gọi `POST /brand/plan/checkout` | — | Trang: "Gói Plus đang tạm ngưng bán. Vui lòng quay lại sau."; API 400 `BRAND_PLUS_UNAVAILABLE` "Gói Brand Plus hiện chưa mở bán" | ✅ | — | ❌ | ❌ | `checkoutIsRejectedWhileThePlanIsOffSale` |
| BP-BUY-10 | W | P0 | User thường, admin, khách | Gọi `/api/v1/brand/plan`, `/quote`, `/checkout` | — | 403 | ✅ | — | — | ❌ | `onlyBrandOwnersReachTheBrandPlanApi` |
| BP-BUY-11 | W | P0 | User thường | Xem `/plans`, gọi `POST /me/subscription/checkout` với `planId` của BRAND_PLUS | — | Gói brand không có trong danh sách; checkout bị từ chối | ✅ | — | — | ❌ | `consumerFlowsNeverOfferOrAcceptBrandPlus` |
| BP-BUY-12 | E | P1 | Có đơn chờ thanh toán | Mở `/brand/plan` | — | "Có một thanh toán {số tiền} đang chờ xác nhận"; nút "Tiếp tục thanh toán" và "Hủy đơn" → "Đã hủy đơn chờ thanh toán" | ❌ | ❌ | ❌ | ❌ | |
| BP-BUY-13 | E | P1 | Đơn PENDING tạo 25 giờ trước | Chờ job (≤ 15 phút) | — | Đơn EXPIRED; voucher đang giữ được trả lại; trang return "Đơn thanh toán đã hết hạn. Vui lòng tạo thanh toán mới." | ✅ | — | — | ❌ | `cancelledFailedOrExpiredOrdersGiveTheVoucherBack` |
| BP-BUY-14 | E | P2 | PayOS live, webhook chưa về | Mở `/brand/plan/return?status=success&orderCode=…` | — | "Đang chờ xác nhận thanh toán", nút "Kiểm tra lại"; **không** báo thành công | — | ❌ | ❌ | ❌ | |
| BP-BUY-15 | W | P1 | Brand bị tạm ngưng | Mở `/brand/plan`, gọi checkout | — | 400 `BRAND_SUSPENDED` "Brand đã bị tạm ngưng. Vui lòng liên hệ FitMe để được hỗ trợ." | ❌ | — | — | ❌ | Dùng chung `getBrandForOwner` |
| BP-BUY-16 | E | P2 | Admin đặt giảm 100% đang chạy | Bấm "Thanh toán" | — | "Giá gói sau giảm phải lớn hơn 0đ. Vui lòng liên hệ FitMe để được kích hoạt."; không tạo đơn | ❌ | — | — | ❌ | Voucher tối đa 99% nên chỉ xảy ra với giảm theo thời gian |

## 6.2 Gia hạn, hết hạn, giảm giá theo thời gian (BP-REN)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BP-REN-01 | H | P0 | Plus còn 10 ngày | Mở `/brand/plan` → "Gia hạn" → thanh toán | — | Trang ghi "Gia hạn sẽ cộng thêm 30 ngày tính từ ngày hết hạn hiện tại (…)"; hạn mới = hạn cũ + 30 ngày, không mất ngày còn lại | ✅ | — | ❌ | ❌ | `secondPaidOrderStacksOnTheCurrentPeriod` |
| BP-REN-02 | H | P1 | Plus đã hết hạn | Mua lại | — | Bắt đầu từ lúc thanh toán, hết hạn sau 30 ngày | ✅ | — | ❌ | ❌ | `renewalAfterExpiryStartsANewPeriodFromNow` |
| BP-REN-03 | H | P1 | Plus hết hạn hôm qua | Chờ job 00:10 giờ VN; mở `/brand/plan` | — | Trạng thái EXPIRED; "Gói Plus trước đã hết hạn ngày dd/MM/yyyy." | ✅ | — | — | ❌ | `expireDueMarksEndedSubscriptionsExpired` |
| BP-REN-04 | E | P1 | Đã qua `endsAt`, job chưa chạy (Render ngủ) | Thử đồ toàn sản phẩm của brand; xem badge, danh sách khách quan tâm, admin "Brand đã mua Plus" | — | Mọi quyền lợi Plus tắt ngay; admin thấy "Hết hạn" | ✅ | — | — | ❌ | `expiredBrandPlusIsChargedLikeAnyOtherBrand`; trạng thái hiệu lực tính theo `endsAt` |
| BP-REN-05 | H | P1 | Admin đặt giảm 20% từ hôm qua đến tuần sau | Mở `/brand/plan` | — | Giá niêm yết gạch, giá hiệu lực 799.200đ, "Giảm 20% · Giảm theo chương trình"; ngoài khoảng thời gian: 999.000đ | ✅ | ✅ | ❌ | ❌ | `statusShowsListPriceWithoutDiscountAndEffectivePriceInsideWindow`, `PlanPricingTest`; `plan-pricing.test` |
| BP-REN-06 | E | P2 | — | Kiểm tra đúng thời điểm bắt đầu / kết thúc giảm; bỏ trống một đầu | — | Biên được tính là đang giảm; đầu bỏ trống = không giới hạn | ✅ | ✅ | — | ❌ | `discountAppliesOnlyInsideInclusiveWindow`, `nullBoundsAreOpen`; "treats the window as inclusive with open bounds" |
| BP-REN-07 | E | P2 | Gói giá 99.999đ, giảm 50% | Xem giá | — | 50.000đ (49.999,5 làm tròn HALF_UP) | ✅ | ✅ | — | ❌ | `roundsHalfUpToWholeVnd`; "rounds half-up to whole VND like the backend" |
| BP-REN-08 | W | P1 | Brand vừa tạo đơn PENDING | Admin đổi giá / giảm giá | — | Đơn đã tạo giữ số tiền cũ; đơn mới dùng giá mới | ❌ | — | — | ❌ | |

## 6.3 Chiến dịch & phát voucher (BV-ISS)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BV-ISS-01 | H | P1 | DB mới chạy migration | `GET /admin/voucher-campaigns` | — | Có chiến dịch "Brand tiên phong" 50%, 3 voucher / brand, tối đa 5 brand, 0 voucher đã phát | ✅ | — | — | ❌ | `migrationSeedsTheTemplateCampaignWithoutIssuingVouchers` |
| BV-ISS-02 | H | P0 | Chiến dịch đang chạy, 2 brand đã duyệt | Phát cho 2 brand | — | Mỗi brand 3 voucher `FITME-XXXX-XXXX`, trạng thái ISSUED; `vouchersIssued` = 6 | ✅ | — | ❌ | ❌ | `issueGivesEveryBrandItsVouchers_skipsBrandsAlreadyServed_andStopsAtMaxBrands` |
| BV-ISS-03 | E | P1 | Brand A đã nhận voucher của chiến dịch | Phát lại cho A và B | — | A nằm trong `skipped`; chỉ B nhận voucher | ✅ | — | — | ❌ | Như trên |
| BV-ISS-04 | E | P0 | Đã phát 4/5 brand | Chọn thêm 2 brand, phát | — | 400 `VOUCHER_CAMPAIGN_FULL` "Chiến dịch chỉ phát cho tối đa 5 brand (đã phát 4, còn 1 suất)"; không brand nào nhận | ✅ | ✅ | — | ❌ | `issuingMoreBrandsThanMaxBrandsInOneCallIsRejectedWholesale`; FE "counts remaining brand slots" |
| BV-ISS-05 | E | P1 | Chiến dịch tắt / đã kết thúc / chưa bắt đầu | Phát voucher | — | "Chiến dịch đang tắt, không thể phát voucher" / "Chiến dịch đã hết hạn, không thể phát voucher" / "Chiến dịch chưa bắt đầu, chưa thể phát voucher" | ✅ | ✅ | — | ❌ | `issueRequiresAnActiveRunningCampaignAndApprovedExistingBrands`; FE "explains why a campaign cannot issue vouchers" |
| BV-ISS-06 | E | P1 | — | Phát cho brand chờ duyệt / tạm ngưng / ID không tồn tại; danh sách brand rỗng | — | 400 `BRAND_NOT_APPROVED` "Brand "X" chưa được duyệt hoặc đang bị tạm ngưng" / 404 "Brand không tồn tại: {id}" / "Chọn ít nhất một brand" | ✅ | — | — | ❌ | Như trên |
| BV-ISS-07 | E | P1 | — | Tạo / sửa chiến dịch: % = 0 hoặc 100; kết thúc trước bắt đầu; giảm số brand tối đa dưới số đã phát | — | "Phần trăm giảm phải từ 1 đến 99" / "Thời điểm kết thúc phải sau thời điểm bắt đầu" / "Số brand tối đa không được nhỏ hơn số brand đã nhận voucher (n)" | ✅ | — | — | ❌ | `campaignValidation_andPercentEditsDoNotTouchIssuedVouchers` |
| BV-ISS-08 | E | P1 | Đã phát voucher 50% | Sửa chiến dịch thành 30% | — | Voucher đã phát vẫn 50%; voucher phát sau dùng 30% | ✅ | — | — | ❌ | Như trên |
| BV-ISS-09 | H | P2 | Chiến dịch có / không có `validUntil` | Phát voucher | — | Hạn voucher = `validUntil`, brand thấy "HSD dd/MM/yyyy"; không có thì "Không thời hạn" | ✅ | ✅ | — | ❌ | `campaignWindowEndBecomesTheVoucherExpiry`; "formats the expiry in Vietnam time…" |
| BV-ISS-10 | H | P1 | Voucher ISSUED | Admin thu hồi; thu hồi lần 2 | — | REVOKED; lần 2 không lỗi, không đổi | ✅ | — | ❌ | ❌ | `revokeOnlyWorksOnUnusedUnreservedVouchers` |
| BV-ISS-11 | E | P1 | Voucher đang giữ / đã dùng / hết hạn | Admin thu hồi | — | 409 `VOUCHER_RESERVED` "Voucher đang được giữ cho một đơn thanh toán chưa hoàn tất, chưa thể thu hồi" / `VOUCHER_USED` "Voucher đã được sử dụng, không thể thu hồi" / `VOUCHER_EXPIRED` "Voucher đã hết hạn, không cần thu hồi" | ✅ | — | — | ❌ | Như trên |
| BV-ISS-12 | H | P2 | Voucher ISSUED quá hạn | Chờ job 00:15 giờ VN | — | Trạng thái EXPIRED | ❌ | — | — | ❌ | Trước khi job chạy, API vẫn hiển thị "Hết hạn" (xem BV-USE-09) |
| BV-ISS-13 | W | P0 | User, brand, khách | Gọi `/admin/voucher-campaigns/**`, `/admin/brand-vouchers/{id}/revoke`; admin gọi `/brand/vouchers` | — | 403 | ✅ | — | — | ❌ | `onlyAdminsReachTheVoucherAdminApi_andOnlyBrandOwnersTheBrandApi` |

## 6.4 Dùng voucher khi mua Plus (BV-USE)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BV-USE-01 | H | P0 | Có voucher 50%, không có giảm theo thời gian | Chọn voucher → "Thanh toán" → trả tiền | — | Báo giá 499.500đ "Giảm 50% · Voucher FITME-…"; khi tạo đơn voucher "Đang giữ cho đơn #…"; trả xong "Đã dùng" | ✅ | ✅ | ❌ | ❌ | `checkoutWithVoucherReservesIt_blocksReuse_andMockConfirmationMarksItUsed`; `brand-voucher.test` |
| BV-USE-02 | E | P0 | Voucher đang giữ cho đơn PENDING khác | Dùng lại voucher (quote hoặc checkout) | — | 409 `VOUCHER_RESERVED` "Voucher đang được giữ cho một đơn thanh toán chưa hoàn tất. Hãy hủy đơn đó hoặc chờ đơn hết hạn để dùng lại voucher." | ✅ | — | — | ❌ | Như trên |
| BV-USE-03 | W | P0 | 1 voucher | 2 request checkout song song cùng voucher | — | Chỉ 1 đơn giữ được voucher; đơn kia bị từ chối | ✅ | — | — | ❌ | `parallelCheckoutsWithTheSameVoucherReserveItOnlyOnce` |
| BV-USE-04 | W | P0 | Đơn có voucher, PayOS live | Webhook trả tiền gửi 2 lần | — | Voucher USED đúng 1 lần, Plus cộng 30 ngày 1 lần | ✅ | — | — | ❌ | `paidWebhookMarksTheReservedVoucherUsedOnce` |
| BV-USE-05 | H | P1 | Đơn có voucher | Đơn bị huỷ / thất bại / hết hạn | — | Voucher về "Chưa dùng"; nếu đã quá hạn thì "Hết hạn" | ✅ | — | — | ❌ | `cancelledFailedOrExpiredOrdersGiveTheVoucherBack` |
| BV-USE-06 | H | P1 | Chương trình giảm 20%, voucher 50% | Xem báo giá | — | Áp 50% từ voucher; voucher được giữ | ✅ | ✅ | — | ❌ | `quoteAppliesTheLargerOfTheRunningDiscountAndTheVoucher`, `BrandPlusDiscountTest.largerVoucherWins`; "names the voucher code when a voucher applies" |
| BV-USE-07 | E | P1 | Chương trình giảm 60%, voucher 50% | Chọn voucher, thanh toán | — | Áp 60%; voucher vẫn "Chưa dùng"; lý do "Chương trình đang giảm 60%, nhiều hơn voucher (50%), nên FitMe áp dụng mức giảm của chương trình và giữ lại voucher cho lần sau." | ✅ | — | — | ❌ | `biggerRunningDiscountWinsAndTheVoucherStaysIssued`, `largerWindowKeepsTheVoucher` |
| BV-USE-08 | E | P2 | Chương trình 50%, voucher 50% | Chọn voucher | — | Áp chương trình, giữ voucher; lý do ghi "bằng mức voucher" | ✅ | — | — | ❌ | `tieGoesToTheWindowSoTheVoucherIsKept` |
| BV-USE-09 | E | P1 | Voucher đã dùng / đã thu hồi / quá hạn | Chọn voucher (API) | — | 400 "Voucher đã được sử dụng" / "Voucher đã bị thu hồi" / "Voucher đã hết hạn"; voucher quá hạn hiển thị "Hết hạn" kể cả trước khi job chạy | ✅ | — | — | ❌ | `expiredVoucherIsShownExpiredAndRejectedAtCheckout` (chỉ phủ trường hợp hết hạn) |
| BV-USE-10 | W | P0 | Brand A, voucher của brand B | Gọi quote / checkout với `voucherId` của B | — | 404 "Voucher không tồn tại" | ✅ | — | — | ❌ | `anotherBrandsVoucherIsNotFound` |
| BV-USE-11 | W | P1 | Brand A | `GET /brand/vouchers` | — | Chỉ thấy voucher của brand A | ✅ | — | — | ❌ | `brandVoucherListOnlyShowsTheCallersVouchers` |

## 6.5 Quyền lợi Brand Plus (PLUS)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PLUS-01 | H | P1 | 2 sản phẩm giống nhau, chỉ khác brand có Plus | Tư vấn outfit | — | Sản phẩm brand Plus xếp trên (+15 điểm mặc định) | ✅ | — | — | ❌ | `plusBrand_outranksNonPlusWithEqualOtherFactors` |
| PLUS-02 | E | P1 | Admin đặt "Điểm ưu tiên gợi ý (brand Plus)" = 0 | Tư vấn | — | Không còn ưu tiên brand Plus | ✅ | — | — | ❌ | `plusBrand_boostOfZeroHasNoEffect` |
| PLUS-03 | H | P1 | Người dùng Premium, chế độ "Đa dạng nhiều brand", brand yêu thích không có Plus | Tư vấn | — | Sản phẩm brand yêu thích xếp trên sản phẩm brand Plus không yêu thích | ✅ | — | — | ❌ | `diverse_favoriteNonPlusOutranksNonFavoritePlus` |
| PLUS-04 | E | P1 | Premium, chế độ "Chỉ brand yêu thích", admin đặt ưu tiên Plus = 100 | Tư vấn | — | Brand yêu thích vẫn thắng brand Plus không yêu thích; giữa 2 brand yêu thích, brand có Plus xếp trên | ✅ | — | — | ❌ | `favoritesOnly_favoriteStillWinsWhenAdminMaxesThePlusBoost`, `favoritesOnly_plusFavoriteBeatsPlainFavorite` |
| PLUS-05 | H | P2 | — | `GET /products/{id}/similar` | — | Sản phẩm brand Plus lên trước | ✅ | — | — | ❌ | `similarProductsListBrandPlusFirst` |
| PLUS-06 | H | P2 | Phiên thử đồ thiếu món dưới | Xem gợi ý hoàn thiện set | — | Ưu tiên sản phẩm brand Plus hơn sản phẩm thường đứng trước | ✅ | — | — | ❌ | `missingRoleSuggestion_prefersBrandPlusProductOverEarlierRegularOne` |
| PLUS-07 | H | P2 | — | Dựng context cho Gemini | — | Chỉ sản phẩm brand Plus được đánh dấu Plus | ✅ | — | — | ❌ | `buildContext_flagsOnlyBrandPlusCandidates` |
| PLUS-08 | H | P0 | Đăng nhập, outfit toàn sản phẩm brand Plus, còn lượt | Mở trang thử đồ → tạo ảnh | — | Nhãn "Miễn phí (còn N lượt hôm nay)"; không trừ Fitken; kết quả `freeTry=true`, `chargedFitken=0` | ✅ | ✅ | ❌ | ❌ | `allPlusOutfitUsesAFreeTryAndSpendsNoFitken`; "shows the free tries left for an all-Plus outfit" |
| PLUS-09 | E | P1 | 0 Fitken, outfit toàn Plus | Tạo ảnh | — | Vẫn tạo được miễn phí; không hiện dialog hết Fitken | ✅ | ✅ | ❌ | ❌ | `userWithoutFitkenCanStillTryPlusProductsForFree`; "lets a user with no Fitken take a free Plus try-on" |
| PLUS-10 | E | P1 | Đã dùng 3/3 lượt hôm nay | Thử lần 4; admin đổi "Lượt thử đồ miễn phí mỗi ngày (brand Plus)" thành 5 | — | Lần 4: "Hết lượt miễn phí hôm nay · Tốn 1 Fitken", trừ 1 Fitken; sau khi đổi cài đặt (≤ 1 phút) lại được miễn phí | ✅ | ✅ | — | ❌ | `dailyLimitReachedFallsBackToFitken_andAdminSettingChangeTakesEffect`; "explains the charge once today" |
| PLUS-11 | E | P1 | Outfit có 1 sản phẩm Plus + 1 sản phẩm thường | Tạo ảnh | — | Nhãn "Tốn 1 Fitken"; trừ Fitken | ✅ | ✅ | — | ❌ | `mixedPlusAndRegularProductsAreCharged` |
| PLUS-12 | E | P1 | Brand vừa hết Plus | Thử sản phẩm của brand | — | Trừ Fitken như brand thường | ✅ | — | — | ❌ | `expiredBrandPlusIsChargedLikeAnyOtherBrand` |
| PLUS-13 | W | P0 | Lượt miễn phí, FASHN trả lỗi khi poll | — | — | Hoàn lượt miễn phí (USED → REFUNDED), không cộng Fitken | ✅ | — | — | ❌ | `providerFailureRefundsTheFreeTryNotFitken` |
| PLUS-14 | W | P1 | Gửi job lên máy chủ VTON thất bại ngay | Tạo ảnh | — | Không tiêu lượt miễn phí, không trừ Fitken | ✅ | — | — | ❌ | `submitFailureNeitherConsumesAFreeTryNorFitken` |
| PLUS-15 | E | P1 | Khách chưa đăng nhập | `GET /try-on/quote?productIds=…` (toàn Plus) | — | `free=false`, `freeRemainingToday=0`; tạo ảnh AI yêu cầu đăng nhập | ✅ | — | — | ❌ | `quoteForGuestsNeverOffersAFreeTry` |
| PLUS-16 | W | P0 | Còn 1 lượt | 2 lượt thử song song; gọi lại cùng tham chiếu | — | Chỉ 1 lượt miễn phí; gọi lại không tiêu thêm | ✅ | — | — | ❌ | `tryConsumeIsIdempotentPerRefAndSerializedPerUser` |
| PLUS-17 | E | P2 | — | Quote với 21 sản phẩm | — | "Tối đa 20 sản phẩm cho một lượt thử đồ" | ❌ | — | — | ❌ | |
| PLUS-18 | E | P2 | Hết lượt lúc 23:59 giờ VN | Thử lại lúc 00:01 | — | Lượt miễn phí được tính lại từ đầu | ❌ | — | — | ❌ | |
| PLUS-19 | H | P1 | Brand đang có Plus | Xem thẻ sản phẩm, trang chi tiết, trang brand | — | Badge "Brand Plus" (title "Brand đối tác FitMe Brand Plus"); API `plusBrand=true` | ✅ | ❌ | ❌ | ❌ | `productAndBrandDtosFlagOnlyActivePlusBrands` |
| PLUS-20 | E | P2 | Brand hết Plus / chưa từng mua | Xem các trang trên | — | Không có badge; `plusBrand=false` | ✅ | ❌ | — | ❌ | Như trên |

## 6.6 Khách quan tâm (LEAD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LEAD-01 | H | P0 | User đăng nhập, brand có Plus | `/redirect/confirm/{id}` → tích "Chia sẻ tên và email với brand khi bạn bấm mua, để brand liên hệ tư vấn và xác nhận đơn" → "Tiếp tục đến nơi bán" | — | Ghi consent `BRAND_LEAD_SHARING`; chuyển tới shop; brand thấy 1 khách quan tâm có tên, email, sản phẩm, size / màu | ✅ | — | ✅ | ❌ | `consentingCustomerGetsOneLeadPerProductAndDay`; redirect-flow "logged-in confirm page toggles the brand lead sharing consent" (chỉ kiểm tra bật / tắt) |
| LEAD-02 | H | P0 | User đăng nhập, chưa đồng ý | Bấm mua | — | Chuyển hướng bình thường; không tạo lead | ✅ | — | — | ❌ | `clickWithoutConsentCreatesNoLead` |
| LEAD-03 | E | P1 | Khách chưa đăng nhập | Mở trang xác nhận → bấm mua | — | Không có ô đồng ý; thấy gợi ý "Đăng nhập … Bạn vẫn có thể mua mà không cần đăng nhập."; chuyển hướng được, không tạo lead | ✅ | ❌ | ❌ | ❌ | `anonymousClickStillRedirectsButNeverCreatesALead` |
| LEAD-04 | E | P1 | Đã đồng ý | Bấm mua cùng sản phẩm 3 lần trong ngày; sản phẩm khác; hôm sau | — | Cùng sản phẩm cùng ngày: 1 lead; sản phẩm khác: lead riêng; hôm sau (giờ VN): lead mới | ✅ | — | — | ❌ | `consentingCustomerGetsOneLeadPerProductAndDay` |
| LEAD-05 | H | P0 | Brand không có Plus, có lead | `GET /brand/leads` | — | `plusRequired=true`; chỉ có `summary` (tổng, đã bán, 30 ngày); không có tên / email | ✅ | — | — | ❌ | `plusBrandSeesCustomerDetails_nonPlusBrandOnlyCounts` |
| LEAD-06 | H | P1 | Brand Plus có > 20 lead | Lọc từ ngày / đến ngày, sản phẩm, đã bán / chưa bán; chuyển trang | — | Kết quả đúng; 20 dòng / trang (API tối đa 100), mới nhất trước | ✅ | ✅ | — | ❌ | `plusLeadListFiltersAndPaginates`; "only sends the filters that are set" |
| LEAD-07 | E | P2 | — | Lọc từ ngày sau đến ngày | — | "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc" | ❌ | ✅ | — | ❌ | "rejects a start date after the end date" |
| LEAD-08 | H | P0 | Brand Plus; khách có lead và đã viết đánh giá sản phẩm | Tích "Đã bán"; rồi bỏ tích | — | Tích: lưu thời điểm, đánh giá của khách có nhãn "Đã mua hàng"; bỏ tích: mất nhãn | ✅ | ✅ | — | ❌ | `soldLeadGivesTheCustomersReviewTheVerifiedBadge_andUnmarkingReverts`; "toggles one row and keeps the sold count in step" |
| LEAD-09 | E | P2 | Lead đã tích "Đã bán" | Gửi `{sold:true}` lần nữa | — | Giữ thời điểm xác nhận đầu tiên | ❌ | — | — | ❌ | |
| LEAD-10 | W | P0 | Brand không Plus; brand A với lead của brand B | `PATCH /brand/leads/{id}/sold` | — | Không Plus: 403 `PLUS_REQUIRED` "Xem và xác nhận khách quan tâm là quyền lợi của FitMe Brand Plus. Nâng cấp để sử dụng."; lead của B: 404 "Khách quan tâm không tồn tại" | ✅ | — | — | ❌ | `markingSoldNeedsPlusAndTheBrandsOwnLead` |
| LEAD-11 | H | P0 | Khách đã có lead | `/profile/privacy` → "Rút lại" ở mục chia sẻ với brand | — | Toast "Đã rút lại đồng ý. Brand sẽ không còn thấy tên và email của bạn."; brand thấy "Khách đã rút đồng ý", không có tên / email, kể cả lead cũ | ✅ | ✅ | ❌ | ❌ | `withdrawingConsentHidesTheCustomerFromTheBrand`; "shows name and email only while the customer still consents" |
| LEAD-12 | W | P0 | Khách có lead | Yêu cầu xoá "Toàn bộ tài khoản", admin xử lý | — | Lead còn trong số đếm; brand thấy "Khách đã xóa tài khoản"; không còn liên kết tới user | ✅ | ✅ | — | ❌ | `erasingTheAccountAnonymizesItsLeads` |
| LEAD-13 | W | P1 | Đồng ý rồi rút lại trước khi bấm mua | Bấm mua | — | Không tạo lead (bản ghi đồng ý mới nhất có hiệu lực) | ❌ | — | — | ❌ | |
| LEAD-14 | E | P1 | Brand Plus vừa hết hạn | Mở danh sách khách quan tâm | — | Quay về chế độ chỉ số liệu tổng (`plusRequired=true`) | ❌ | — | — | ❌ | |
| LEAD-15 | E | P2 | Bấm mua từ trang quyết định thử đồ với size M, màu Đen | Brand xem lead | — | Cột "Size / màu" = "M · Đen"; thiếu thì "—" | ❌ | ✅ | — | ❌ | "joins size and colour" |

## 6.7 Khách thử đồ trên dashboard brand (CUS)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CUS-01 | H | P1 | 3 khách (2 user, 1 khách vãng lai) đã thử sản phẩm của brand | `GET /brand/dashboard` | — | `tryOnCustomers7d`, `tryOnCustomers30d` = 3 | ✅ | — | — | ❌ | `brandDashboard_countsDistinctTryOnCustomersAndTheFunnel` |
| CUS-02 | E | P1 | 1 user thử 5 lần | Xem dashboard | — | Đếm 1 khách | ✅ | — | — | ❌ | Như trên |
| CUS-03 | H | P1 | Có khách thử, bấm mua, lead đã bán | Xem "Phễu khách hàng 30 ngày" | — | Khách thử đồ → Khách bấm mua → Đơn brand xác nhận đã bán; tỉ lệ mỗi bước so với bước trước | ✅ | ✅ | — | ❌ | Như trên; "rates each step against the previous one" |
| CUS-04 | H | P2 | Brand có 12 sản phẩm được thử | Xem "Sản phẩm được thử nhiều nhất (30 ngày)" | — | Tối đa 10 sản phẩm, xếp theo số khách; chưa có thì "Chưa có khách thử đồ sản phẩm của bạn trong 30 ngày qua." | ✅ | ❌ | ❌ | ❌ | Như trên |
| CUS-05 | W | P1 | — | Kiểm tra dữ liệu dashboard trả về | — | Không chứa tên, email, SĐT của khách | ✅ | — | — | ❌ | `brandDashboard_aggregatesEventsWithoutPii` |
| CUS-06 | E | P2 | Brand không có Plus | Mở `/brand/dashboard` | — | Mở được, đủ chỉ số; không chặn bởi gói | — | — | ✅ | ❌ | brand-full "dashboard is open without billing gate" |
