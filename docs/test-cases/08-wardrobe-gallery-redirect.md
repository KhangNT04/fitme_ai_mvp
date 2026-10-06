# 08 · Tủ đồ, thư viện ảnh, đã lưu, chuyển hướng mua & tủ chi tiêu (WAR / GAL / SAV / RED / PUR)

[← Mục lục](../TEST_CASES.md)

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Tủ đồ | Dùng được cho khách (theo session) và người dùng. Tên, loại, danh mục bắt buộc; màu, chất liệu, form tuỳ chọn. Ảnh cần đồng ý "WARDROBE_IMAGE_UPLOAD", JPG / PNG / WEBP ≤ 5 MB. **Không giới hạn số món. Trang chưa có nút sửa / xoá** |
| Thư viện ảnh | Cần đăng nhập. Chỉ ảnh thử mặc AI thật. Xoá mềm. API mặc định 24 ảnh / trang (1–60); **FE chỉ tải 20 ảnh, không phân trang** |
| Đã lưu | Hai tab "Gợi ý outfit" và "Kết quả thử mặc"; xoá có xác nhận |
| Chuyển hướng mua | `/redirect/confirm/{id}` → `/redirect/loading?url&event` → sau 2,2 giây mở shop. Nút mua chỉ hiện khi sản phẩm ACTIVE, có danh mục, không hết hàng, có ảnh, link `http(s)` hợp lệ |
| Tủ chi tiêu | `/profile/purchases`: lịch sử click mua, đánh dấu "Đã mua thật?"; dùng được cho khách |

---

## 8.1 Tủ đồ (WAR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WAR-01 | H | P1 | Đăng nhập | `/wardrobe` → thêm món: tên, danh mục, màu | `Áo thun trắng`, Áo, Trắng | Món xuất hiện trong danh sách | ✅ | ✅ | ✅ | ✅ | `WardrobeControllerTest`; role-flows |
| WAR-02 | H | P1 | Khách | Thêm món | — | Lưu theo session; đăng nhập sau đó thì món chuyển sang tài khoản | ✅ | — | ❌ | ❌ | |
| WAR-03 | H | P1 | — | Thêm món có ảnh, tích "Đồng ý upload ảnh item" | Ảnh JPG 1 MB | Ảnh hiển thị; ghi consent tủ đồ | ❌ | ✅ | ❌ | ❌ | `wardrobe-api.test recordConsent…` |
| WAR-04 | E | P1 | — | Chọn ảnh nhưng không tích đồng ý | — | "Vui lòng đồng ý upload ảnh trước khi lưu."; API "Cần đồng ý upload ảnh tủ đồ trước" | ❌ | ❌ | ❌ | ❌ | |
| WAR-05 | E | P1 | — | Bỏ trống tên / danh mục | — | Báo lỗi bắt buộc | ❌ | ❌ | ❌ | ❌ | |
| WAR-06 | E | P2 | — | Ảnh sai định dạng / > 5 MB | — | Báo lỗi định dạng / dung lượng | ❌ | ✅ | ❌ | ❌ | |
| WAR-07 | E | P2 | Tủ đồ trống | Mở `/wardrobe` | — | Trạng thái trống + nút thêm | — | — | — | ✅ | |
| WAR-08 | H | P2 | Có món | Sửa / xoá món trên giao diện | — | Có thể sửa / xoá | ✅ | ✅ | ❌ | ✅ | Đã sửa #35 (`d88f285`). Trước đây: Chỉ có API, trang chưa có nút sửa / xoá; prod xoá qua API |
| WAR-09 | W | P0 | Session A | Đọc / sửa / xoá món của session B | — | "Không có quyền truy cập món tủ đồ này" | ✅ | — | — | ❌ | `listItems_isolatedPerSession` |
| WAR-10 | H | P2 | Xoá món có ảnh | — | — | Ảnh bị xoá khỏi storage | ❌ | — | — | ❌ | |
| WAR-11 | H | P1 | Có món tủ đồ | "Tư vấn từ tủ đồ" | — | Chat tư vấn có món tủ đồ trong outfit | ❌ | ✅ | ✅ | ❌ | role-flows "tủ đồ → tư vấn"; xem AI-REC-14 |
| WAR-12 | W | P2 | — | Tên món chứa HTML | `<b>áo</b>` | Hiển thị như văn bản | ❌ | ❌ | ❌ | ❌ | |

## 8.2 Thư viện ảnh (GAL)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GAL-01 | H | P1 | Đã thử mặc AI thành công | Mở `/profile/gallery` | — | Ảnh mới nhất; ngày tạo "dd/MM/yyyy HH:mm"; danh sách "Sản phẩm trong ảnh" | ✅ | — | ❌ | ✅ | `completedTryOnIsAutoSavedAndCanBeDeleted`; prod chỉ mở trang |
| GAL-02 | E | P1 | Khách | Mở `/profile/gallery` | — | "Đăng nhập để xem thư viện" + nút "Đăng nhập ngay" (redirect về thư viện) | ✅ | — | ❌ | ❌ | `galleryRequiresLogin` |
| GAL-03 | E | P2 | Chưa có ảnh | Mở thư viện | — | "Thư viện của bạn đang trống." + nút "Thử đồ AI ngay" | — | ❌ | ❌ | ✅ | |
| GAL-04 | H | P1 | — | Mở ảnh → "Xóa" → xác nhận | — | "Đã xóa ảnh khỏi thư viện." | ✅ | — | ❌ | ❌ | |
| GAL-05 | H | P2 | — | Bấm "Tải về" | — | Tải file ảnh | — | ❌ | ❌ | ❌ | |
| GAL-06 | H | P2 | Trình duyệt hỗ trợ Web Share | Bấm "Chia sẻ" | — | Mở bảng chia sẻ hệ thống | — | ❌ | ❌ | ❌ | |
| GAL-07 | E | P2 | Không hỗ trợ Web Share (desktop) | Bấm "Chia sẻ" | — | Tải ảnh về + "Đã tải ảnh về. Đăng ảnh lên trang cá nhân rồi dán link ở trang Nhận thưởng nhé!" | — | ❌ | ❌ | ❌ | |
| GAL-08 | E | P2 | 25 ảnh | Cuộn thư viện | — | Thấy đủ 25 ảnh (có phân trang / tải thêm) | ❌ | ✅ | ❌ | ❌ | Đã sửa #36 (`d88f285`). Trước đây: FE chỉ tải 20 ảnh, không phân trang |
| GAL-09 | W | P0 | User A | Xoá ảnh của B qua API | — | "Ảnh không tồn tại trong thư viện" | ✅ | — | — | ❌ | BE `GalleryIntegrationTest#completedTryOnIsAutoSavedAndCanBeDeleted` |
| GAL-10 | E | P2 | — | Thẻ thưởng chia sẻ | — | Số Fitken khớp cấu hình (3) | — | ❌ | — | ✅ | Đã sửa #44 (`73e0fc9`). Trước đây: UI ghi "Nhận 2 Fitken" |
| GAL-11 | W | P1 | Có yêu cầu xoá dữ liệu ảnh đã xử lý | Mở thư viện | — | Không còn ảnh | ❌ | — | — | ❌ | |

## 8.3 Đã lưu (SAV)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SAV-01 | H | P1 | Đã lưu outfit và kết quả thử | Mở `/saved-outfits` | — | Tab "Gợi ý outfit": "{n} món trong set"; tab "Kết quả thử mặc": "{n} món đã thử · Avatar mẫu / Ảnh của bạn" | ✅ | ✅ | ✅ | ✅ | role-flows; saved-outfits.spec 🟡 |
| SAV-02 | E | P2 | Chưa lưu gì | Mở trang | — | "Chưa có gợi ý outfit" + "Bắt đầu tư vấn"; "Chưa có kết quả thử mặc" + "Thử mặc AI" | — | ❌ | ❌ | ✅ | |
| SAV-03 | H | P1 | — | Xoá 1 mục → xác nhận "Xóa" | — | "Đã xóa khỏi danh sách đã lưu" | ✅ | — | ❌ | ❌ | |
| SAV-04 | E | P2 | — | Xoá → "Giữ lại" | — | Không xoá | — | ❌ | ❌ | ❌ | |
| SAV-05 | W | P2 | 1 trong 2 API lỗi | Mở trang | — | Tab lỗi có nút thử lại; tab kia vẫn hiển thị | — | ❌ | ❌ | ❌ | |
| SAV-06 | H | P2 | — | "Xem" kết quả thử mặc | — | Mở `/try-on/result/{id}?from=saved`; "Quay lại" về Đã lưu | — | ✅ | ❌ | ❌ | `nav-context.test resolveSavedResultBack…` |

## 8.4 Chuyển hướng mua tại shop gốc (RED)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RED-01 | H | P0 | Sản phẩm đủ điều kiện | Bấm mua → "Tiếp tục đến nơi bán" | — | Ghi nhận click; `/redirect/loading` "Đang chuyển hướng..."; sau 2,2 giây mở link shop | ✅ | — | ✅ | ❌ | `buyClick_withEligibleProduct…`; role-flows |
| RED-02 | H | P1 | — | Đọc trang xác nhận | — | "Thanh toán và đơn hàng được xử lý bởi shop/sàn bán hàng. FitMe AI không xử lý thanh toán." | — | — | ✅ | ❌ | redirect-flow.spec |
| RED-03 | W | P1 | Sản phẩm thiếu ảnh / hết hàng / link `data:` / `javascript:` | Mở trang sản phẩm | — | Không hiện nút mua | ✅ | — | — | ❌ | `ProductEligibilityServiceTest`, `UrlValidatorTest` |
| RED-04 | W | P1 | Sản phẩm không đủ điều kiện | Gọi `POST /redirects/buy-click` | — | "Sản phẩm không khả dụng để mua"; tạo "Link bị gắn cờ" cho admin | ✅ | — | — | ❌ | `buyClick_withIneligibleProduct_returnsBadRequest` |
| RED-05 | W | P1 | — | Mở `/redirect/loading?url=javascript:alert(1)` | — | "Liên kết không hợp lệ" / "URL chuyển hướng phải bắt đầu bằng http:// hoặc https://" + "Về khám phá" | — | ❌ | ✅ | ❌ |  |
| RED-06 | W | P1 | — | Mở `/redirect/loading?url=https://evil.com` | — | Ghi nhận: trang chuyển tới bất kỳ URL http(s) nào (open redirect) | — | ❌ | ❌ | ❌ | Rủi ro lừa đảo qua link FitMe |
| RED-07 | E | P1 | Buy-click lỗi (mạng) | Bấm "Tiếp tục đến nơi bán" | — | Có thông báo lỗi | — | ✅ | ❌ | ❌ | Đã sửa #48 (`73e0fc9`). Trước đây: Lỗi bị nuốt, nút chỉ bật lại |
| RED-08 | E | P2 | Mua từ trang quyết định thử mặc | Kiểm tra sự kiện | — | `sourcePage` = trang thử mặc, có `tryOnRequestId`, size, màu | ❌ | ✅ | — | ✅ | Đã sửa #49 (`73e0fc9`). Trước đây: Luôn gửi `PRODUCT_DETAIL`, không gửi ngữ cảnh |
| RED-09 | H | P2 | Ở trang loading | Bấm "Đã mua?" | — | Đổi thành "Đã ghi nhận"; toast "Đã ghi nhận đã mua — xem lại trong Tủ chi tiêu" | ❌ | — | ❌ | ❌ | |
| RED-10 | W | P1 | Session A | Đọc sự kiện của session B | — | 403 | ✅ | — | — | ❌ | `getEvent_withDifferentSession_returnsForbidden` |
| RED-11 | E | P2 | Không có session | Đọc sự kiện | — | 401 | ✅ | — | — | ❌ | `getEvent_withoutSession_returnsUnauthorized` |

## 8.5 Tủ chi tiêu (PUR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PUR-01 | H | P2 | Có click mua | Mở `/profile/purchases` | — | Tổng click, đã mua, chi tiêu ước tính, tháng này; danh sách mới nhất trước | ❌ | ✅ | ❌ | ❌ | `purchase-helpers.test` |
| PUR-02 | H | P2 | — | Tìm theo tên brand / sản phẩm (không phân biệt hoa thường) | — | Lọc đúng | — | ✅ | ❌ | ❌ | |
| PUR-03 | H | P2 | — | Bật "Chỉ đã mua" | — | Chỉ mục đã đánh dấu | — | ❌ | ❌ | ❌ | |
| PUR-04 | H | P2 | — | "Đã mua thật?" → rồi "Bỏ đánh dấu" | — | Chi tiêu ước tính cộng / trừ giá sản phẩm | ❌ | — | ❌ | ❌ | |
| PUR-05 | H | P2 | — | "Mua lại" | — | Mở luồng chuyển hướng cho sản phẩm đó | — | ❌ | ❌ | ❌ | |
| PUR-06 | E | P2 | — | Tìm lối vào trang từ Hồ sơ | — | Có link trong trang Hồ sơ | — | — | — | ❌ | Trang chưa được liên kết từ Hồ sơ |
