# 11 · Cổng quản trị — Admin portal (ADM)

[← Mục lục](../TEST_CASES.md)

Ghi chú: avatar mẫu xem [04-try-on.md](04-try-on.md#46-quản-trị-avatar-mẫu-ava), đánh giá xem [05-catalog-review.md](05-catalog-review.md), thưởng chia sẻ và trần Fitken xem [07-fitken-premium-rewards.md](07-fitken-premium-rewards.md), quyền riêng tư xem [09-privacy-email.md](09-privacy-email.md), logic gói Brand Plus và voucher brand xem [06-brand-plus-voucher-lead.md](06-brand-plus-voucher-lead.md).

Đơn hàng & đối soát (ADM-ORD-01..07) và ADM-GRW-05 (số tiền đơn hoàn một phần) đã xoá vì thương mại in-app bị gỡ ở V27 (`7ae8d1d`); trang `/admin/orders`, `/admin/settlements` không còn.

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Menu | Tổng quan, Quản lý tài khoản, Thống kê truy cập, Thương hiệu, Partnerships, Gói dịch vụ, Voucher brand, Duyệt chia sẻ, Đánh giá, Duyệt sản phẩm, Link bị gắn cờ, Phân tích tăng trưởng, Khách quay lại, Khách trả tiền, Quyền riêng tư, Giám sát thử mặc, Avatar mẫu thử đồ, Cài đặt hệ thống, Đổi mật khẩu |
| Tài khoản | Tìm theo email / tên (không phân biệt hoa thường, debounce 350 ms); lọc vai trò USER / BRAND_OWNER / ADMIN và trạng thái ACTIVE / SUSPENDED; 20 / trang (tối đa 100); **không lọc theo gói**. Thẻ tóm tắt đọc `premiumUsers`. Không khoá được chính mình hoặc admin khác |
| Khoá | Request tiếp theo của người bị khoá bị từ chối ngay; cookie portal vẫn còn tối đa 24 giờ |
| Fitken | Điều chỉnh −10.000..10.000, khác 0; ghi chú tuỳ chọn (mặc định "Admin điều chỉnh Fitken"); không bị áp trần Fitken miễn phí |
| Duyệt sản phẩm | Duyệt bị chặn nếu thiếu ảnh hoặc thiếu link mua hợp lệ; thiếu biến thể / bảng size chỉ cảnh báo. Lý do từ chối được lưu (≤ 100 ký tự) và brand thấy |
| Gói dịch vụ | `/admin/billing/plans` có 2 tab "Gói người dùng" (Premium, top-up Fitken) và "Gói brand" (Brand Plus, `?tab=brand`). Mã, tên bắt buộc; giá ≥ 1; gói người dùng cần Fitken ≥ 1; gói tháng cần số ngày > 0; gói brand phải là SUBSCRIPTION; giảm giá 0–100% kèm khoảng thời gian **chỉ cho gói brand**; không đổi được đối tượng gói; mã trùng bị chặn; gói đã có người mua không xoá được. Tab brand có bảng "Brand đã mua Plus" |
| Voucher brand | `/admin/vouchers`: tạo / sửa chiến dịch, phát cho brand đã duyệt, xem và thu hồi voucher. Quy tắc chi tiết ở module 06 (BV) |
| Cài đặt hệ thống | `/admin/settings`: `fitken.max_balance` "Trần Fitken miễn phí" (50, 0–100000), `tryon.plus_free_daily` "Lượt thử đồ miễn phí mỗi ngày (brand Plus)" (3, 0–100), `recommendation.plus_boost` "Điểm ưu tiên gợi ý (brand Plus)" (15, 0–100, 0 = tắt). Cache 60 giây: "Thay đổi có hiệu lực trong vòng một phút." |
| Khách quay lại | `/admin/retention`: chỉ tính tài khoản USER theo `user_activity_days` (giờ VN). DAU / WAU / MAU, độ gắn bó DAU/MAU, D1 / D7 / D30 trên nhóm đăng ký 30 ngày, 8 nhóm tuần (thứ Hai – Chủ nhật), tần suất 1 / 2–3 / 4–7 / 8+ ngày, khách rời đi 30 ngày, top 20 khách. Tỉ lệ = null ("—") khi mẫu số bằng 0 |
| Truy cập | 1 dòng / khách / ngày; bỏ qua admin, bot, user-agent rỗng, trang `/admin*` `/brand*`; 7–90 ngày (UI 30 / 90); giờ VN |
| CSV | `fitme-khach-tra-tien-YYYY-MM-DD.csv`, UTF-8 BOM; ô bắt đầu `= + - @` được thêm `'`. Chỉ gồm giao dịch gói Premium (`PREMIUM_SUBSCRIPTION`); doanh thu Brand Plus không nằm trong báo cáo này |

---

## 11.1 Tổng quan (ADM-DSH)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-DSH-01 | H | P1 | Admin | Mở `/admin/dashboard` | — | Tổng brand, brand chờ duyệt, sản phẩm, sản phẩm chờ duyệt, link bị gắn cờ, người dùng, người dùng hoạt động, tư vấn AI, thử mặc AI, thư viện ảnh; **không** còn số liệu thương mại (GMV, hoa hồng) | ✅ | — | ✅ | ❌ | `dashboard_asAdmin_returnsStats`, `adminDashboard_returnsAggregateCountsOnly`. PROD 04/10 kiểm tra bản còn số liệu thương mại |
| ADM-DSH-02 | H | P2 | — | So sánh số liệu với DB | — | Khớp số thực tế | ❌ | — | — | ❌ | |
| ADM-DSH-03 | H | P2 | — | Bấm từng mục menu | — | Mở đúng trang, tải không lỗi (gồm Gói dịch vụ, Voucher brand, Khách quay lại, Cài đặt hệ thống) | — | — | ✅ | ✅ | role-flows portal; admin-full.spec 🟡. PROD chưa kiểm tra các trang mới |
| ADM-DSH-04 | E | P2 | — | Mở `/admin/rules/styles`, `/admin/rules/occasions`, `/admin/orders`, `/admin/settlements` | — | Không còn trang (chuyển về dashboard hoặc 404) | — | — | — | ✅ | PROD chỉ kiểm tra 2 trang rules |

## 11.2 Quản lý tài khoản (ADM-USR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-USR-01 | H | P1 | — | Mở `/admin/users` | — | Thẻ Tổng tài khoản, Người dùng ("n đang dùng Premium"), Brand ("n quản trị viên"), Đang bị khóa; bảng 20 dòng / trang | ✅ | — | ❌ | ❌ | `adminSearchesAccounts…`. PROD 05/10 kiểm tra nhãn "Pro" cũ |
| ADM-USR-02 | H | P1 | — | Tìm theo một phần email / tên, khác hoa thường | `KHANG` | Kết quả đúng sau ~350 ms | ✅ | — | ❌ | ✅ | |
| ADM-USR-03 | H | P1 | — | Lọc vai trò Brand + trạng thái Đang bị khoá | — | Kết quả đúng | ✅ | — | ❌ | ✅ | |
| ADM-USR-04 | E | P2 | — | Gọi API lọc giá trị lạ | `role=GOD` | "Giá trị lọc không hợp lệ: GOD" | ❌ | — | — | ❌ | |
| ADM-USR-05 | E | P2 | — | `size=1000` | — | Tối đa 100 dòng | ❌ | — | — | ❌ | |
| ADM-USR-06 | H | P0 | User đang đăng nhập ở máy khác | Bấm "Khóa" → xác nhận ("…sẽ bị đăng xuất khỏi mọi thiết bị…") | `user@fitme.ai` | Trạng thái "Đang bị khóa"; người đó bị đăng xuất, không đăng nhập lại được | ✅ | — | ❌ | ✅ | Prod 05/10 |
| ADM-USR-07 | H | P0 | Tài khoản bị khoá | "Mở khóa" | — | Đăng nhập lại được | ✅ | — | ❌ | ✅ | |
| ADM-USR-08 | W | P0 | — | Khoá chính mình / admin khác (API) | — | "Bạn không thể khóa hoặc mở khóa chính tài khoản của mình" / "Không thể khóa tài khoản quản trị viên"; UI ẩn nút | ✅ | — | — | ❌ | `adminsCannotLockThemselvesOrOtherAdmins` |
| ADM-USR-09 | E | P2 | — | PATCH status giá trị lạ | `DELETED` | "Trạng thái không hợp lệ (ACTIVE hoặc SUSPENDED)" | ❌ | — | — | ❌ | |
| ADM-USR-10 | H | P1 | User Free | Bấm "Lên Premium" | — | Toast "Đã nâng {email} lên Premium"; Premium 30 ngày + 15 Fitken; badge "Premium" | ✅ | — | ❌ | ❌ | `adminGrantPremiumCreatesSubscriptionWithFitken` |
| ADM-USR-11 | H | P1 | User Premium | Bấm "Về Free" | — | Toast "Đã chuyển {email} về Free"; huỷ gói; quỹ Fitken gói về 0; brand yêu thích và tủ đồ được giữ nhưng bị khoá | ❌ | — | ❌ | ❌ | |
| ADM-USR-12 | E | P2 | — | Nút "Lên Premium" / "Về Free" với dòng Brand / Admin | — | Không hiển thị | — | ❌ | ❌ | ✅ | PROD kiểm tra với nhãn cũ, hành vi không đổi |
| ADM-USR-13 | H | P1 | — | "Điều chỉnh Fitken" +10, ghi chú "Bồi thường" | — | Số dư +10 (kể cả khi đã ở trần Fitken miễn phí); lịch sử ghi "ADMIN_ADJUST" + ghi chú | ✅ | — | ❌ | ❌ | `adminCanAdjustAndInspectWallet`, `paidSubscriptionAndAdminCreditsAreNeverCapped` |
| ADM-USR-14 | E | P1 | — | Điều chỉnh 0 / 10.001 / −10.001 | — | Nút "Áp dụng" khoá khi 0; API: "Số Fitken điều chỉnh phải khác 0" / lỗi giới hạn | ❌ | ❌ | ❌ | ❌ | |
| ADM-USR-15 | W | P0 | User / brand | Gọi `/admin/users` | — | 403 | ✅ | — | ✅ | ✅ | `onlyAdminsCanManageAccounts` |
| ADM-USR-16 | E | P2 | — | Badge vai trò trong bảng | — | Một dòng, không xuống hàng | — | — | — | ✅ | Sửa ở `ee9d956` |
| ADM-USR-17 | E | P2 | — | Muốn lọc người dùng Premium | — | Ghi nhận: chưa có bộ lọc theo gói | — | — | — | — | |

## 11.3 Thương hiệu & partnerships (ADM-BRD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-BRD-01 | H | P0 | Có đơn brand chờ duyệt | `/admin/brands` → "Duyệt" | — | Toast "Đã duyệt thương hiệu. Chủ brand cần đăng nhập lại để nhận quyền."; user thành BRAND_OWNER | ✅ | — | ✅ | ❌ | `approveBrand_elevatesUserRole`; role-flows |
| ADM-BRD-02 | H | P1 | — | "Từ chối" | — | Trạng thái Từ chối; brand thấy "Đơn đăng ký đã bị từ chối", gửi lại được | ❌ | — | ❌ | ❌ | Không lưu lý do |
| ADM-BRD-03 | H | P1 | Brand đã duyệt | "Tạm ngưng" | — | Sản phẩm brand biến mất khỏi cửa hàng; brand thấy "Brand đã bị tạm ngưng" | ✅ | — | ❌ | ❌ | Đã sửa #3 (`8153a83`). Trước đây: Brand tạm ngưng vẫn xử lý đơn / đối soát được |
| ADM-BRD-04 | E | P2 | — | Badge trạng thái | — | Nhãn tiếng Việt | — | ✅ | ✅ | ❌ | Đã sửa #50 (`73e0fc9`). Trước đây: Trang hiện mã enum thô (PENDING…) |
| ADM-BRD-05 | E | P2 | Brand đã duyệt | Gọi approve / reject lại (API) | — | Bị chặn chuyển trạng thái vô lý | ❌ | — | — | ❌ | Không có kiểm tra trạng thái |
| ADM-BRD-06 | H | P2 | — | `/admin/partnerships` chọn Brand A, B → tạo | — | Cặp đối tác lưu; outfit của người dùng Premium ưu tiên phối 2 brand | ✅ | — | ❌ | ✅ | `upsertOrdersByUuid…` |
| ADM-BRD-07 | E | P2 | — | Tạo partnership A–A / trùng | — | Bị chặn hoặc không tạo trùng | ❌ | — | — | ❌ | |
| ADM-BRD-08 | H | P2 | Có brand đang Plus và brand đã hết Plus | Mở `/admin/brands` | — | Danh sách có thông tin Plus (`plusActive`, `plusEndsAt`): brand đang Plus hiện hạn; brand hết hạn không được đánh dấu Plus | ❌ | ❌ | ❌ | ❌ | |

## 11.4 Duyệt sản phẩm & link gắn cờ (ADM-PRD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-PRD-01 | H | P0 | Có sản phẩm chờ duyệt | `/admin/products/moderation` → chi tiết → "Duyệt" | — | Sản phẩm "Đang hiển thị", xuất hiện ở `/discover` | ✅ | — | ✅ | ✅ | `listPendingAndApprove_asAdmin`; role-flows |
| ADM-PRD-02 | E | P1 | Sản phẩm thiếu ảnh | Mở chi tiết | — | Cảnh báo "Thiếu ảnh sản phẩm"; nút Duyệt bị khoá; API "Không thể duyệt: …" | ❌ | — | ❌ | ❌ | |
| ADM-PRD-03 | E | P2 | Thiếu biến thể / bảng size | Duyệt | — | Cảnh báo nhưng vẫn duyệt được | ❌ | — | ❌ | ❌ | |
| ADM-PRD-04 | H | P1 | — | "Từ chối" kèm lý do | `Ảnh không đúng sản phẩm` | Sản phẩm "Bị từ chối"; brand thấy lý do | ✅ | — | ❌ | ✅ | Đã sửa #31 (`d88f285`). Trước đây: Backend không lưu lý do từ chối |
| ADM-PRD-05 | H | P1 | — | "Gắn cờ" kèm lý do | `Giá sai` | Trạng thái "Cần xử lý"; tab "Đã gắn cờ"; lý do lưu | ❌ | — | ❌ | ❌ | UI bắt buộc lý do |
| ADM-PRD-06 | E | P2 | — | Gắn cờ không nhập lý do | — | Nút "Gắn cờ" bị khoá | — | ❌ | ❌ | ❌ | |
| ADM-PRD-07 | W | P1 | Sản phẩm đang hiển thị | Gọi approve lại / approve sản phẩm bị từ chối | — | Ghi nhận: duyệt được từ mọi trạng thái | ❌ | — | — | ❌ | Không có kiểm tra trạng thái |
| ADM-PRD-08 | W | P0 | Khách / brand | Gọi approve | — | 403 | ✅ | — | — | ❌ | `approveProduct_withoutAuth_returnsForbidden` |
| ADM-PRD-09 | H | P2 | Có link mua lỗi được gắn cờ | `/admin/flagged-links` → "Đã xử lý" / "Từ chối" | — | Link biến mất khỏi danh sách (chỉ hiện link OPEN) | ❌ | — | ❌ | ✅ | |
| ADM-PRD-10 | W | P0 | Sản phẩm cũ (trước V27) chưa có link mua hợp lệ | Duyệt | — | Bị chặn; sản phẩm không lên cửa hàng khi khách không có đường mua | ✅ | — | — | ❌ | `approveProduct_withoutValidPurchaseUrl_isBlocked` |

## 11.5 Gói dịch vụ (ADM-PLN)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-PLN-01 | H | P1 | — | Tab "Gói người dùng" → "Thêm gói" (`/admin/billing/plans/new`) → gói nạp: mã, tên, giá, Fitken | `TOPUP_10`, 19000, 10 | Gói xuất hiện ở `/pricing` mục "Mua thêm Fitken" | ❌ | — | ❌ | ✅ | Prod tạo qua API 04/10 |
| ADM-PLN-02 | H | P1 | — | Sửa giá gói Premium | — | `/pricing` cập nhật; mã gói không sửa được | ❌ | — | ❌ | ❌ | |
| ADM-PLN-03 | H | P2 | — | Bỏ tích "Đang bán" | — | Gói biến mất khỏi `/pricing`; mua bằng API báo "Gói không còn khả dụng" | ❌ | — | ❌ | ❌ | Với gói brand xem BP-BUY-09 |
| ADM-PLN-04 | E | P1 | — | Mã / tên trống | — | "Nhập mã gói" / lỗi tên, không gửi form | — | ❌ | ❌ | ❌ | |
| ADM-PLN-05 | E | P1 | — | Gói người dùng: giá 0 / Fitken 0 | — | Giá tối thiểu 1; "Gói người dùng cần số Fitken >= 1" | ❌ | ✅ | ❌ | ❌ | "requires Fitken for consumer plans and a period for subscriptions" |
| ADM-PLN-06 | E | P1 | — | Gói tháng số ngày 0 | — | "Gói tháng cần billingPeriodDays > 0" | ❌ | ✅ | ❌ | ❌ | Như trên |
| ADM-PLN-07 | E | P1 | — | Đặt giảm giá cho gói người dùng (API) | — | "Giảm giá hiện chỉ áp dụng cho gói brand" | ✅ | — | — | ❌ | `adminCannotPutDiscountsOnConsumerPlansOrMoveAPlanBetweenAudiences`. Thay case "gói nạp kèm voucher freeship" cũ |
| ADM-PLN-08 | E | P1 | — | Tạo mã trùng | `PREMIUM_MONTHLY` | "Mã gói đã tồn tại" | ❌ | — | ❌ | ❌ | |
| ADM-PLN-09 | W | P1 | Gói đã có người mua | Xoá gói | — | "Gói đã có người mua — hãy tắt gói (active=false) thay vì xóa" | ❌ | — | ❌ | ❌ | |
| ADM-PLN-10 | W | P1 | Người dùng / brand đang ở trang thanh toán gói | Admin đổi giá | — | Đơn đã tạo giữ giá cũ; đơn mới dùng giá mới | ❌ | — | — | ❌ | Xem BP-REN-08 |
| ADM-PLN-11 | H | P1 | — | Mở `/admin/billing/plans`, bấm tab "Gói brand" | — | Tiêu đề "Gói dịch vụ"; 2 tab "Gói người dùng" / "Gói brand"; URL có `tab=brand`; tab brand có gói "FitMe Brand Plus" và bảng "Brand đã mua Plus" | — | — | ✅ | ❌ | admin-full "billing plans page splits consumer and brand plans into tabs" |
| ADM-PLN-12 | H | P1 | — | Sửa gói Brand Plus: giá, giảm 20%, bắt đầu / kết thúc | — | Lưu được; nhãn "Đang giảm" khi đang trong khoảng, "Giảm chưa áp dụng" khi chưa tới; cột "Giá hiện tại" là giá sau giảm | ✅ | ✅ | ❌ | ❌ | `adminUpdatesBrandPlusPriceAndDiscountWithValidation`; `plan-pricing.test`, "accepts a brand plan with a discount window and open bounds" |
| ADM-PLN-13 | E | P1 | — | Giảm 101%; kết thúc trước bắt đầu; gói brand loại TOPUP | — | "Phần trăm giảm giá phải từ 0 đến 100" (FE "Phần trăm giảm phải từ 0 đến 100") / "Thời điểm kết thúc giảm giá phải sau thời điểm bắt đầu" / "Gói brand phải là gói theo chu kỳ (SUBSCRIPTION)" | ✅ | ✅ | — | ❌ | Như trên; "rejects percent outside 0..100 and windows that end before they start" |
| ADM-PLN-14 | E | P2 | — | Đổi đối tượng gói người dùng ↔ brand (API) | — | "Không thể đổi đối tượng của gói (người dùng / brand)" | ✅ | — | — | ❌ | `adminCannotPutDiscountsOnConsumerPlansOrMoveAPlanBetweenAudiences` |
| ADM-PLN-15 | H | P2 | — | Tạo gói brand không nhập Fitken | — | Tạo được (gói brand không cộng Fitken) | ✅ | — | — | ❌ | `adminCreatesBrandPlanWithoutFitken` |
| ADM-PLN-16 | H | P2 | Có brand đang Plus, brand hết hạn, brand chưa chạy job | Xem bảng "Brand đã mua Plus" | — | Cột trạng thái "Đang hoạt động" / "Hết hạn" / "Đã hủy" và "Hết hạn"; brand quá `endsAt` hiện "Hết hạn" kể cả khi job chưa chạy; chưa có thì "Chưa có brand nào mua Plus" | ❌ | ❌ | ❌ | ❌ | `GET /admin/brand-subscriptions` |

## 11.6 Voucher brand (ADM-VCH)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-VCH-01 | H | P1 | — | Menu "Voucher brand" | — | Bảng Chiến dịch, Giảm, Brand đã phát, Đã dùng / đã phát, Thời gian ("Không giới hạn" khi không đặt), Trạng thái ("Đang hoạt động" / "Tắt" / "Đã kết thúc") | ✅ | — | ✅ | ❌ | `migrationSeedsTheTemplateCampaignWithoutIssuingVouchers`; portal paths (chỉ kiểm tra tiêu đề) |
| ADM-VCH-02 | H | P1 | — | "Tạo chiến dịch" → điền form "Chiến dịch mới" → "Tạo chiến dịch" | `Mùa hè`, 30%, 2 voucher / brand, 10 brand | Toast "Đã tạo chiến dịch voucher"; chiến dịch xuất hiện trong bảng | ✅ | — | ❌ | ❌ | `campaignValidation_andPercentEditsDoNotTouchIssuedVouchers` |
| ADM-VCH-03 | H | P0 | Chiến dịch đang chạy | "Chi tiết" → "Phát voucher": tìm brand, chọn 2 brand → "Phát voucher" | — | Mô tả "Mỗi brand được chọn nhận n voucher giảm x%… Còn n suất brand."; "Đã chọn 2 brand"; toast "Đã phát 6 voucher cho 2 brand"; brand đã nhận có nhãn "Đã phát" | ✅ | ✅ | ❌ | ❌ | `issueGivesEveryBrandItsVouchers_skipsBrandsAlreadyServed_andStopsAtMaxBrands`; "counts remaining brand slots" |
| ADM-VCH-04 | E | P1 | Còn 1 suất | Chọn 2 brand | — | "Vượt quá 1 suất brand còn lại."; nút phát bị khoá | ❌ | ❌ | ❌ | ❌ | API vẫn chặn, xem BV-ISS-04 |
| ADM-VCH-05 | E | P1 | Chiến dịch tắt / hết hạn / chưa bắt đầu / đủ brand | Mở chi tiết | — | "Chiến dịch đang tắt." / "Chiến dịch đã hết hạn." / "Chiến dịch bắt đầu phát từ dd/MM/yyyy." / "Chiến dịch đã phát đủ số brand tối đa." | — | ✅ | ❌ | ❌ | "explains why a campaign cannot issue vouchers" |
| ADM-VCH-06 | H | P1 | Đã phát voucher | Bảng "Voucher đã phát" → "Thu hồi" một voucher chưa dùng → xác nhận | — | Cột Mã, Giảm, Trạng thái, Hạn dùng, Đơn ("#… (chờ thanh toán)"); dialog "Thu hồi voucher?" "Voucher X của Y sẽ không dùng được nữa. Không thể hoàn tác."; toast "Đã thu hồi voucher" | ✅ | — | ❌ | ❌ | `revokeOnlyWorksOnUnusedUnreservedVouchers` |
| ADM-VCH-07 | E | P2 | Voucher đang giữ / đã dùng | Thu hồi | — | Toast lỗi với thông báo 409 từ API (xem BV-ISS-11) | ✅ | — | ❌ | ❌ | Như trên |
| ADM-VCH-08 | H | P2 | — | "Sửa chiến dịch" → đổi tên, % → "Lưu thay đổi" | — | Toast "Đã cập nhật chiến dịch"; voucher đã phát giữ % cũ | ✅ | — | ❌ | ❌ | `campaignValidation_andPercentEditsDoNotTouchIssuedVouchers` |

## 11.7 Cài đặt hệ thống (ADM-SET)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-SET-01 | H | P1 | — | Menu "Cài đặt hệ thống" | — | 3 cài đặt có nhãn tiếng Việt, mô tả, giá trị hiện tại, khoảng cho phép; mô tả trang "Điều chỉnh các thông số vận hành. Thay đổi có hiệu lực trong vòng một phút." | ✅ | — | ✅ | ❌ | `adminListsSeededSettingsWithVietnameseLabels`; portal paths |
| ADM-SET-02 | H | P0 | — | Đổi "Trần Fitken miễn phí" 50 → 30 → "Lưu" | `30` | Toast `Đã lưu "Trần Fitken miễn phí": 30`; trong ≤ 1 phút ví trả `maxBalance` = 30 | ✅ | — | ❌ | ❌ | `adminUpdatesSettingAndCacheIsInvalidated` |
| ADM-SET-03 | E | P1 | — | Lưu giá trị trống / `abc` / ngoài khoảng | ``, `abc`, `100001` | 400 `SETTING_INVALID`: `Vui lòng nhập giá trị cho "X"` / `"X" phải là số nguyên` / `"X" phải nằm trong khoảng 0 - 100000`; toast lỗi | ✅ | — | ❌ | ❌ | `invalidValuesAreRejectedInVietnamese` |
| ADM-SET-04 | W | P0 | User / brand / khách | Gọi `GET /admin/settings`, `PUT /admin/settings/{key}` | — | 403 | ✅ | — | — | ❌ | `nonAdminsCannotReadOrUpdateSettings` |
| ADM-SET-05 | E | P2 | — | `PUT /admin/settings/khong.ton.tai` | — | 404 "Cài đặt không tồn tại" | ❌ | — | — | ❌ | |
| ADM-SET-06 | H | P1 | — | Đổi "Lượt thử đồ miễn phí mỗi ngày (brand Plus)" | `5` | Người dùng có thêm lượt miễn phí trong ngày | ✅ | — | — | ❌ | `dailyLimitReachedFallsBackToFitken_andAdminSettingChangeTakesEffect`; xem PLUS-10 |
| ADM-SET-07 | H | P1 | — | Đổi "Điểm ưu tiên gợi ý (brand Plus)" = 0 | `0` | Gợi ý không còn ưu tiên brand Plus | ❌ | — | — | ❌ | Chấm điểm với mức 0 có test (PLUS-02), đường từ cài đặt tới chấm điểm chưa có |
| ADM-SET-08 | E | P2 | Cài đặt chưa có dòng trong DB | Đọc giá trị | — | Dùng giá trị mặc định | ✅ | — | — | — | `unknownKeysFallBackToCallerDefault` |

## 11.8 Thống kê truy cập (ADM-TRF)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-TRF-01 | H | P1 | — | Mở `/admin/traffic` | — | Hôm nay so với hôm qua (cùng giờ), 7 ngày, 30 ngày; biểu đồ ngày / tuần / tháng / thứ trong tuần; nhận xét tự động | ✅ | ✅ | ❌ | ✅ | `visitsAreCountedPerBrowserPerDay…`, `traffic-insights.test` |
| ADM-TRF-02 | H | P1 | Khách mới | Mở 5 trang khác nhau trên cửa hàng | — | Khách hôm nay +1; lượt xem trang +5 | ✅ | — | ❌ | ✅ | |
| ADM-TRF-03 | E | P1 | — | Mở cùng trang 2 lần liên tiếp | — | Lượt xem chỉ +1 | — | ❌ | — | ❌ | |
| ADM-TRF-04 | E | P1 | Admin đăng nhập | Duyệt cửa hàng và trang admin | — | Không được tính | ✅ | ✅ | — | ❌ | "does not count portal pages…" |
| ADM-TRF-05 | E | P1 | — | Gửi visit với user-agent `Googlebot`, `curl`, rỗng | — | Không được tính | ✅ | — | — | ❌ | `botsAndEmptyAgentsAreIgnored` |
| ADM-TRF-06 | E | P2 | — | Gửi `visitorId` không phải UUID | `abc` | "visitorId không hợp lệ" | ❌ | — | — | ❌ | |
| ADM-TRF-07 | H | P2 | Chưa có dữ liệu | Xem nhận xét | — | "Chưa đủ dữ liệu" | ✅ | ✅ | — | ❌ | `noTrafficIsReportedAsNoData` |
| ADM-TRF-08 | H | P2 | Tuần này tăng ≥ 20% | Xem xu hướng | — | "Tăng mạnh" | ✅ | ✅ | — | ❌ | `growingTrafficIsStrongUpAndAboveAverage` |
| ADM-TRF-09 | H | P2 | Truy cập đều | — | — | "Ổn định", mức "Bình thường" | ✅ | — | — | ❌ | |
| ADM-TRF-10 | H | P2 | Giảm mạnh, dao động lớn | — | — | "Giảm mạnh", biến động cao | ✅ | — | — | ❌ | |
| ADM-TRF-11 | E | P2 | Tuần trước = 0 | — | — | % thay đổi không hiển thị số (null) | ✅ | ✅ | — | ❌ | `changePctIsNullWithoutABaseline` |
| ADM-TRF-12 | E | P2 | — | Chuyển 30 / 90 ngày; gọi API `days=5`, `days=365` | — | Giới hạn trong 7–90 | ❌ | — | ❌ | ❌ | |
| ADM-TRF-13 | W | P2 | — | Gửi visit với cùng `visitorId` 200.000 lần | — | Lượt xem tối đa 100.000 / ngày | ❌ | — | — | ❌ | |
| ADM-TRF-14 | W | P1 | — | Script gửi visit với UUID ngẫu nhiên liên tục | — | Ghi nhận: không có giới hạn tần suất, số liệu có thể bị thổi phồng | ❌ | — | — | ❌ | |
| ADM-TRF-15 | E | P2 | Truy cập lúc 23:59 và 00:01 giờ VN | — | — | Tính vào 2 ngày khác nhau | ❌ | — | — | ❌ | |

## 11.9 Tăng trưởng, khách trả tiền, giám sát thử mặc (ADM-GRW)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-GRW-01 | H | P1 | — | `/admin/analytics`, chọn 7 / 30 / 90 ngày | — | Phễu: Đăng ký → Xác minh email → Dùng tư vấn / thử đồ AI → Bắt đầu thanh toán gói Premium → Đã thanh toán; top 10 nguồn đăng ký ("(trực tiếp)" khi không có UTM) | ✅ | — | ❌ | ❌ | `metricsCountActiveUsersSignupSourcesAndFunnel`. PROD 04/10 kiểm tra phễu cũ có bước giỏ hàng |
| ADM-GRW-02 | H | P1 | — | `/admin/paying-customers` | — | Chỉ giao dịch gói Premium (loại "Gói FitMe Premium"), doanh thu thật, tổng ghi nhận; giao dịch giả lập được ghi chú riêng | ✅ | — | ❌ | ❌ | `payingCustomersReportListsPaidProSubscriptionsAndExportsCsv`. PROD 04/10 kiểm tra bản có cả đơn hàng |
| ADM-GRW-03 | H | P1 | — | Tải CSV, mở bằng Excel | — | Tên `fitme-khach-tra-tien-YYYY-MM-DD.csv`; tiếng Việt không lỗi font; đủ cột | ✅ | — | ❌ | ❌ | CSV chưa tải trên prod |
| ADM-GRW-04 | W | P0 | Khách có tên `=HYPERLINK("http://evil.com")` | Xuất CSV, mở Excel | — | Ô bắt đầu bằng `'`, không chạy công thức | ✅ | — | — | ❌ | Chống CSV injection; BE `P0PortalIntegrationTest#payingCustomersCsv_neutralisesFormulaInjection` |
| ADM-GRW-06 | W | P0 | User / brand | Gọi API báo cáo, CSV | — | 403 | ✅ | — | — | ❌ | `reportsAreAdminOnly` |
| ADM-GRW-07 | H | P2 | — | `/admin/try-on-monitoring` | — | Lượt thử bắt đầu, preview đã tạo, preview lỗi | ❌ | — | ❌ | ✅ | |
| ADM-GRW-08 | H | P2 | Có thuê bao Premium | `/admin/analytics` phần doanh thu | — | Thẻ "Doanh thu gói Premium" kèm số thuê bao đang hoạt động; "Thanh toán gói Premium": "Mở thanh toán gói Premium" và số đã thanh toán | ✅ | — | ❌ | ❌ | `metricsCountActiveUsersSignupSourcesAndFunnel` |

## 11.10 Khách quay lại (ADM-RET)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-RET-01 | H | P1 | Có khách hoạt động | Menu "Khách quay lại" | — | Khối "Khách hoạt động": "Hôm nay (DAU)", "7 ngày (WAU)", "30 ngày (MAU)" kèm số khách đã đăng ký, "Độ gắn bó (DAU/MAU)" | ✅ | — | ✅ | ❌ | `retentionMetricsFromActivityDays`; portal paths (chỉ kiểm tra tiêu đề) |
| ADM-RET-02 | H | P1 | Khách đăng ký trong 30 ngày qua | Xem "Tỉ lệ giữ chân" | — | Thẻ "Quay lại ngày 1 (D1)", D7, D30 với "x/y khách · đăng ký dd/MM – dd/MM" | ✅ | — | ❌ | ❌ | Như trên |
| ADM-RET-03 | H | P2 | — | Xem "Nhóm đăng ký theo tuần" | — | 8 hàng tuần (thứ Hai – Chủ nhật, giờ VN), cột "Tuần 0…"; ô đậm dần theo tỉ lệ; tuần chưa tới để trống ("Chưa tới tuần này") | ✅ | ✅ | ❌ | ❌ | Như trên; `retention-format.test` heatmap, "spans Monday to Sunday across month boundaries" |
| ADM-RET-04 | H | P2 | — | Xem "Tần suất hoạt động" | — | 4 cột: 1, 2–3, 4–7, 8+ ngày hoạt động trong 30 ngày | ✅ | — | ❌ | ❌ | Như trên |
| ADM-RET-05 | H | P2 | — | Xem "Khách đã rời đi" | — | Số khách từng hoạt động nhưng không quay lại 30 ngày, % trên tổng khách đã đăng ký | ✅ | — | ❌ | ❌ | Như trên |
| ADM-RET-06 | H | P2 | — | Xem "Khách hoạt động nhiều nhất" | — | Top 20 theo số ngày hoạt động; cột Khách hàng, Hoạt động gần nhất, Số ngày hoạt động, Tư vấn AI, Thử đồ AI, Bấm mua (30 ngày) | ✅ | — | ❌ | ❌ | Như trên |
| ADM-RET-07 | E | P2 | Chưa có khách / mẫu số bằng 0 | Mở trang | — | Tỉ lệ hiện "—"; "Chưa có khách hoạt động trong 30 ngày qua."; không lỗi chia 0 | ✅ | ✅ | ❌ | ❌ | "shows a dash when there is no data" |
| ADM-RET-08 | E | P1 | Admin và brand cũng hoạt động | Xem số liệu | — | Chỉ đếm tài khoản role USER | ✅ | — | — | ❌ | `retentionMetricsFromActivityDays` |
| ADM-RET-09 | W | P0 | User / brand | Gọi `GET /admin/retention` | — | 403 | ✅ | — | — | ❌ | `retentionIsAdminOnly` |

## 11.11 Tài khoản admin (ADM-ACC)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-ACC-01 | H | P1 | — | `/admin/account` đổi mật khẩu | — | Như AUTH-CHP-01 | ✅ | — | ❌ | ❌ | Prod chỉ mở trang |
| ADM-ACC-02 | W | P0 | — | Mọi API `/api/v1/admin/**` khi là user / brand / khách | — | 403 | ✅ | — | ✅ | ✅ | `SecurityConfigTest`, rbac.spec |
