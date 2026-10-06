# 11 · Cổng quản trị — Admin portal (ADM)

[← Mục lục](../TEST_CASES.md)

Ghi chú: avatar mẫu xem [04-try-on.md](04-try-on.md#46-quản-trị-avatar-mẫu-ava), đánh giá xem [05-catalog-review.md](05-catalog-review.md), thưởng chia sẻ xem [07-fitken-pro-rewards.md](07-fitken-pro-rewards.md), quyền riêng tư xem [09-privacy-email.md](09-privacy-email.md).

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Menu | Tổng quan, Quản lý tài khoản, Thống kê truy cập, Thương hiệu, Partnerships, Gói người dùng, Đơn hàng, Đối soát seller, Duyệt chia sẻ, Đánh giá, Duyệt sản phẩm, Link bị gắn cờ, Phân tích tăng trưởng, Khách trả tiền, Quyền riêng tư, Giám sát thử mặc, Avatar mẫu thử đồ, Đổi mật khẩu |
| Tài khoản | Tìm theo email / tên (không phân biệt hoa thường, debounce 350 ms); lọc vai trò USER / BRAND_OWNER / ADMIN và trạng thái ACTIVE / SUSPENDED; 20 / trang (tối đa 100); **không lọc theo gói**. Không khoá được chính mình hoặc admin khác |
| Khoá | Request tiếp theo của người bị khoá bị từ chối ngay; cookie portal vẫn còn tối đa 24 giờ |
| Fitken | Điều chỉnh −10.000..10.000, khác 0; ghi chú tuỳ chọn (mặc định "Admin điều chỉnh Fitken") |
| Duyệt sản phẩm | Duyệt bị chặn nếu thiếu ảnh; thiếu biến thể / bảng size chỉ cảnh báo. **Từ chối không lưu lý do** (FE gửi nhưng BE bỏ qua) |
| Gói | Mã, tên bắt buộc; giá ≥ 1; Fitken ≥ 1; gói tháng cần số ngày > 0; gói nạp không kèm voucher; mã trùng bị chặn; gói đã có người mua không xoá được |
| Truy cập | 1 dòng / khách / ngày; bỏ qua admin, bot, user-agent rỗng, trang `/admin*` `/brand*`; 7–90 ngày (UI 30 / 90); giờ VN |
| CSV | `fitme-khach-tra-tien-YYYY-MM-DD.csv`, UTF-8 BOM; ô bắt đầu `= + - @` được thêm `'` |

---

## 11.1 Tổng quan (ADM-DSH)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-DSH-01 | H | P1 | Admin | Mở `/admin/dashboard` | — | Tổng brand, sản phẩm, link lỗi, người dùng, tư vấn AI, thử mặc AI, thư viện ảnh, thương mại (GMV, hoa hồng…) | ✅ | — | ✅ | ✅ | `dashboard_asAdmin_returnsStats`, `adminDashboard_returnsAggregateCountsOnly` |
| ADM-DSH-02 | H | P2 | — | So sánh số liệu với DB | — | Khớp số thực tế | ❌ | — | — | ❌ | |
| ADM-DSH-03 | H | P2 | — | Bấm từng mục menu | — | Mở đúng trang, tải không lỗi | — | — | ✅ | ✅ | role-flows portal; admin-full.spec 🟡 |
| ADM-DSH-04 | E | P2 | — | Mở `/admin/rules/styles`, `/admin/rules/occasions` | — | Chuyển về dashboard (đã gỡ tính năng) | — | — | — | ✅ | |

## 11.2 Quản lý tài khoản (ADM-USR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-USR-01 | H | P1 | — | Mở `/admin/users` | — | Thẻ Tổng tài khoản, Người dùng ("n đang dùng Pro"), Brand ("n quản trị viên"), Đang bị khóa; bảng 20 dòng / trang | ✅ | — | ❌ | ✅ | `adminSearchesAccounts…` |
| ADM-USR-02 | H | P1 | — | Tìm theo một phần email / tên, khác hoa thường | `KHANG` | Kết quả đúng sau ~350 ms | ✅ | — | ❌ | ✅ | |
| ADM-USR-03 | H | P1 | — | Lọc vai trò Brand + trạng thái Đang bị khoá | — | Kết quả đúng | ✅ | — | ❌ | ✅ | |
| ADM-USR-04 | E | P2 | — | Gọi API lọc giá trị lạ | `role=GOD` | "Giá trị lọc không hợp lệ: GOD" | ❌ | — | — | ❌ | |
| ADM-USR-05 | E | P2 | — | `size=1000` | — | Tối đa 100 dòng | ❌ | — | — | ❌ | |
| ADM-USR-06 | H | P0 | User đang đăng nhập ở máy khác | Bấm "Khóa" → xác nhận ("…sẽ bị đăng xuất khỏi mọi thiết bị…") | `user@fitme.ai` | Trạng thái "Đang bị khóa"; người đó bị đăng xuất, không đăng nhập lại được | ✅ | — | ❌ | ✅ | Prod 05/10 |
| ADM-USR-07 | H | P0 | Tài khoản bị khoá | "Mở khóa" | — | Đăng nhập lại được | ✅ | — | ❌ | ✅ | |
| ADM-USR-08 | W | P0 | — | Khoá chính mình / admin khác (API) | — | "Bạn không thể khóa hoặc mở khóa chính tài khoản của mình" / "Không thể khóa tài khoản quản trị viên"; UI ẩn nút | ✅ | — | — | ❌ | `adminsCannotLockThemselvesOrOtherAdmins` |
| ADM-USR-09 | E | P2 | — | PATCH status giá trị lạ | `DELETED` | "Trạng thái không hợp lệ (ACTIVE hoặc SUSPENDED)" | ❌ | — | — | ❌ | |
| ADM-USR-10 | H | P1 | User Free | Bấm "Lên Pro" | — | Gói Pro 30 ngày + 15 Fitken; badge Pro | ✅ | — | ❌ | ❌ | `adminGrantProCreatesSubscriptionWithFitken` |
| ADM-USR-11 | H | P1 | User Pro | Bấm "Về Free" | — | Huỷ gói; quỹ Fitken gói về 0 | ❌ | — | ❌ | ❌ | |
| ADM-USR-12 | E | P2 | — | Nút Pro / Free với dòng Brand / Admin | — | Không hiển thị | — | ❌ | ❌ | ✅ | |
| ADM-USR-13 | H | P1 | — | "Điều chỉnh Fitken" +10, ghi chú "Bồi thường" | — | Số dư +10; lịch sử ghi "ADMIN_ADJUST" + ghi chú | ✅ | — | ❌ | ❌ | `adminCanAdjustAndInspectWallet` |
| ADM-USR-14 | E | P1 | — | Điều chỉnh 0 / 10.001 / −10.001 | — | Nút "Áp dụng" khoá khi 0; API: "Số Fitken điều chỉnh phải khác 0" / lỗi giới hạn | ❌ | ❌ | ❌ | ❌ | |
| ADM-USR-15 | W | P0 | User / brand | Gọi `/admin/users` | — | 403 | ✅ | — | ✅ | ✅ | `onlyAdminsCanManageAccounts` |
| ADM-USR-16 | E | P2 | — | Badge vai trò trong bảng | — | Một dòng, không xuống hàng | — | — | — | ✅ | Sửa ở `ee9d956` |
| ADM-USR-17 | E | P2 | — | Muốn lọc người dùng Pro | — | Ghi nhận: chưa có bộ lọc theo gói | — | — | — | — | |

## 11.3 Thương hiệu & partnerships (ADM-BRD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-BRD-01 | H | P0 | Có đơn brand chờ duyệt | `/admin/brands` → "Duyệt" | — | Toast "Đã duyệt thương hiệu. Chủ brand cần đăng nhập lại để nhận quyền."; user thành BRAND_OWNER | ✅ | — | ✅ | ❌ | `approveBrand_elevatesUserRole`; role-flows |
| ADM-BRD-02 | H | P1 | — | "Từ chối" | — | Trạng thái Từ chối; brand thấy "Đơn đăng ký đã bị từ chối", gửi lại được | ❌ | — | ❌ | ❌ | Không lưu lý do |
| ADM-BRD-03 | H | P1 | Brand đã duyệt | "Tạm ngưng" | — | Sản phẩm brand biến mất khỏi cửa hàng; brand thấy "Brand đã bị tạm ngưng" | ✅ | — | ❌ | ❌ | Đã sửa #3 (`8153a83`). Trước đây: Brand tạm ngưng vẫn xử lý đơn / đối soát được |
| ADM-BRD-04 | E | P2 | — | Badge trạng thái | — | Nhãn tiếng Việt | — | ✅ | ✅ | ❌ | Đã sửa #50 (`73e0fc9`). Trước đây: Trang hiện mã enum thô (PENDING…) |
| ADM-BRD-05 | E | P2 | Brand đã duyệt | Gọi approve / reject lại (API) | — | Bị chặn chuyển trạng thái vô lý | ❌ | — | — | ❌ | Không có kiểm tra trạng thái |
| ADM-BRD-06 | H | P2 | — | `/admin/partnerships` chọn Brand A, B → tạo | — | Cặp đối tác lưu; outfit Pro ưu tiên phối 2 brand | ✅ | — | ❌ | ✅ | `upsertOrdersByUuid…` |
| ADM-BRD-07 | E | P2 | — | Tạo partnership A–A / trùng | — | Bị chặn hoặc không tạo trùng | ❌ | — | — | ❌ | |

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

## 11.5 Đơn hàng & đối soát (ADM-ORD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-ORD-01 | H | P1 | — | `/admin/orders`, chuyển 6 tab, mở chi tiết | — | Danh sách toàn sàn, có thông tin người mua; chỉ xem | ✅ | — | ❌ | ✅ | `adminOrderList_showsBuyer…` |
| ADM-ORD-02 | H | P1 | Có đơn giao > 7 ngày | `/admin/settlements` → "Tạo kỳ đối soát" → xác nhận | — | Mỗi brand 1 kỳ "Chờ chuyển khoản" | ✅ | — | ❌ | ✅ | `generation_includesOnlyDeliveredOrdersPastHoldPeriod…` |
| ADM-ORD-03 | H | P1 | Có kỳ chờ | "Đánh dấu đã trả", nhập mã giao dịch | `FT2610050001` | "Đã thanh toán"; brand thấy cập nhật | ❌ | — | ❌ | ❌ | |
| ADM-ORD-04 | E | P2 | — | Đánh dấu đã trả không nhập mã / mã > 200 ký tự | — | Bị chặn | ❌ | ❌ | ❌ | ❌ | |
| ADM-ORD-05 | E | P2 | Kỳ đã trả | Đánh dấu lại (API) | — | Bị từ chối (chỉ từ "Chờ chuyển khoản") | ❌ | — | — | ❌ | |
| ADM-ORD-06 | W | P1 | — | Bấm "Tạo kỳ đối soát" 2 lần | — | Không tạo kỳ trùng cho cùng đơn | ❌ | — | — | ❌ | |
| ADM-ORD-07 | H | P2 | — | Lọc đối soát theo trạng thái và brand | — | Kết quả đúng | ❌ | — | ❌ | ❌ | |

## 11.6 Gói người dùng (ADM-PLN)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-PLN-01 | H | P1 | — | `/admin/billing/plans/new` → gói nạp: mã, tên, giá, Fitken | `TOPUP_10`, 19000, 10 | Gói xuất hiện ở `/pricing` mục "Mua thêm Fitken" | ❌ | — | ❌ | ✅ | Prod tạo qua API 04/10 |
| ADM-PLN-02 | H | P1 | — | Sửa giá gói Pro | — | `/pricing` cập nhật; mã gói không sửa được | ❌ | — | ❌ | ❌ | |
| ADM-PLN-03 | H | P2 | — | Bỏ tích "Đang bán" | — | Gói biến mất khỏi `/pricing`; mua bằng API báo "Gói không còn khả dụng" | ❌ | — | ❌ | ❌ | |
| ADM-PLN-04 | E | P1 | — | Mã / tên trống | — | Nút lưu bị khoá | — | ❌ | ❌ | ❌ | |
| ADM-PLN-05 | E | P1 | — | Giá 0 / Fitken 0 | — | Lỗi "tối thiểu 1" | ❌ | ❌ | ❌ | ❌ | |
| ADM-PLN-06 | E | P1 | — | Gói tháng số ngày 0 | — | "Gói tháng cần billingPeriodDays > 0" | ❌ | — | ❌ | ❌ | |
| ADM-PLN-07 | E | P2 | — | Gói nạp kèm 2 voucher (API) | — | "Gói top-up Fitken không kèm voucher freeship" | ❌ | — | — | ❌ | |
| ADM-PLN-08 | E | P1 | — | Tạo mã trùng | `PRO_MONTHLY` | "Mã gói đã tồn tại" | ❌ | — | ❌ | ❌ | |
| ADM-PLN-09 | W | P1 | Gói đã có người mua | Xoá gói | — | "Gói đã có người mua — hãy tắt gói (active=false) thay vì xóa" | ❌ | — | ❌ | ❌ | |
| ADM-PLN-10 | W | P1 | Người dùng đang ở trang thanh toán gói | Admin đổi giá | — | Đơn đã tạo giữ giá cũ; đơn mới dùng giá mới | ❌ | — | — | ❌ | |

## 11.7 Thống kê truy cập (ADM-TRF)

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

## 11.8 Tăng trưởng, khách trả tiền, giám sát thử mặc (ADM-GRW)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-GRW-01 | H | P1 | — | `/admin/analytics`, chọn 7 / 30 / 90 ngày | — | Phễu: Đăng ký → Xác minh email → Dùng tư vấn / thử đồ → Thêm giỏ / chọn Pro → Bắt đầu thanh toán → Đã thanh toán; top 10 nguồn đăng ký ("(trực tiếp)" khi không có UTM) | ✅ | — | ❌ | ✅ | `metricsCountActiveUsersSignupSourcesAndFunnel` |
| ADM-GRW-02 | H | P1 | — | `/admin/paying-customers` | — | Khách đã trả tiền, giao dịch, doanh thu thật, tổng ghi nhận | ✅ | — | ❌ | ✅ | `payingCustomersReportListsPaidPro…` |
| ADM-GRW-03 | H | P1 | — | Tải CSV, mở bằng Excel | — | Tên `fitme-khach-tra-tien-YYYY-MM-DD.csv`; tiếng Việt không lỗi font; đủ 9 cột | ✅ | — | ❌ | ❌ | CSV chưa tải trên prod |
| ADM-GRW-04 | W | P0 | Khách có tên `=HYPERLINK("http://evil.com")` | Xuất CSV, mở Excel | — | Ô bắt đầu bằng `'`, không chạy công thức | ✅ | — | — | ❌ | Chống CSV injection; BE `P0PortalIntegrationTest#payingCustomersCsv_neutralisesFormulaInjection` |
| ADM-GRW-05 | E | P2 | — | Số tiền đơn có hoàn một phần | — | Số tiền = tổng − cần hoàn | ❌ | — | — | ❌ | |
| ADM-GRW-06 | W | P0 | User / brand | Gọi API báo cáo, CSV | — | 403 | ✅ | — | — | ❌ | `reportsAreAdminOnly` |
| ADM-GRW-07 | H | P2 | — | `/admin/try-on-monitoring` | — | Lượt thử bắt đầu, preview đã tạo, preview lỗi | ❌ | — | ❌ | ✅ | |

## 11.9 Tài khoản admin (ADM-ACC)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-ACC-01 | H | P1 | — | `/admin/account` đổi mật khẩu | — | Như AUTH-CHP-01 | ✅ | — | ❌ | ❌ | Prod chỉ mở trang |
| ADM-ACC-02 | W | P0 | — | Mọi API `/api/v1/admin/**` khi là user / brand / khách | — | 403 | ✅ | — | ✅ | ✅ | `SecurityConfigTest`, rbac.spec |
