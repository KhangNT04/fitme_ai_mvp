# 09 · Quyền riêng tư & email (PRV / MAIL)

[← Mục lục](../TEST_CASES.md)

MAIL-11, MAIL-12, MAIL-14 (email xác nhận đơn COD / PayOS) đã xoá vì thương mại in-app bị gỡ ở V27 (`7ae8d1d`). Các ID còn lại giữ nguyên.

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Consent | Loại: PRIVACY_NOTICE, PHOTO_UPLOAD, WARDROBE_IMAGE_UPLOAD, AI_PREVIEW, **BRAND_LEAD_SHARING** (từ V32); phiên bản "2026-01". **Bản ghi mới nhất có hiệu lực**: gửi `accepted:false` là rút lại đồng ý. `GET /privacy/consent` trả trạng thái từng loại |
| Chia sẻ tên và email với brand | Bật ở trang xác nhận mua (ô "Chia sẻ tên và email với brand khi bạn bấm mua…") hoặc ở `/profile/privacy` (nút "Đồng ý" / "Rút lại"). Toast: "Đã đồng ý. Khi bạn bấm mua, brand của sản phẩm sẽ thấy tên và email của bạn." / "Đã rút lại đồng ý. Brand sẽ không còn thấy tên và email của bạn." Rút lại thì brand không còn thấy tên, email ở mọi lead cũ |
| Chính sách bảo mật | `/privacy-policy` mục "3. Chia sẻ dữ liệu": brand mặc định chỉ nhận số liệu tổng hợp ẩn danh; chỉ khi người dùng đồng ý rõ ràng thì tên và email được chia sẻ với brand của sản phẩm được bấm mua; rút lại được bất kỳ lúc nào; xoá tài khoản thì liên kết với các lượt quan tâm được ẩn danh hoá. PayOS chỉ xử lý giao dịch gói Premium / Fitken |
| Yêu cầu xoá | Trang `/profile/privacy` có 3 lựa chọn: "Dữ liệu session / tư vấn", "Chỉ ảnh đã upload", "Toàn bộ tài khoản" (chọn này sẽ đăng xuất sau 2 giây). Admin bấm "Xử lý" → xoá theo loại rồi đánh dấu COMPLETED. "Toàn bộ tài khoản": xoá hồ sơ cơ thể / phong cách, brand yêu thích (chế độ phối về DIVERSE), tủ đồ, ảnh, kết quả thử, lịch sử gợi ý / chat, đánh giá; lead của brand chuyển sang ẩn danh (`user_id = NULL`, `anonymized_at`); tài khoản bị ẩn danh và khoá. Giữ đơn gói và sổ Fitken cho kế toán. Chủ brand phải xử lý tay |
| Email | Ưu tiên: relay HTTPS (Vercel `/api/mail-relay` → Gmail) → Resend → SMTP. Relay xác thực bằng `secret` trong body; 1 người nhận; tiêu đề ≤ 200 ký tự; nội dung ≤ 200.000 ký tự |
| Email được gửi | Mã xác minh, link đặt lại mật khẩu, kích hoạt Premium / cộng Fitken. **Không** gửi: chào mừng, đổi mật khẩu, khoá tài khoản, xử lý xoá dữ liệu, thông báo cho brand. Email xác nhận đơn hàng (COD / PayOS) đã gỡ cùng thương mại in-app (V27) |

---

## 9.1 Quyền riêng tư (PRV)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PRV-01 | H | P1 | — | Tích đồng ý trước khi upload ảnh | — | Ghi consent PHOTO_UPLOAD phiên bản 2026-01 | ✅ | ✅ | ✅ | ❌ | `recordConsent_asUser` |
| PRV-02 | E | P1 | Đã đồng ý | Gửi `accepted: false` rồi upload ảnh | — | Upload bị chặn (đã rút lại đồng ý) | ✅ | — | — | ✅ | Đã sửa #7 (`ec1f64a`). Trước đây: Hiện vẫn upload được vì chỉ kiểm tra "có từng đồng ý" |
| PRV-03 | H | P1 | Đăng nhập | `/profile/privacy` → "Dữ liệu session / tư vấn" → gửi | — | "Yêu cầu xóa dữ liệu đã được ghi nhận. Admin sẽ xử lý trong thời gian sớm nhất." | ✅ | — | ✅ | ❌ | `requestDeletion_asUser`; role-flows |
| PRV-04 | H | P1 | — | Chọn "Toàn bộ tài khoản" | — | Hộp cảnh báo; gửi xong đăng xuất sau 2 giây, về trang chủ | ❌ | ❌ | ❌ | ❌ | |
| PRV-05 | E | P2 | Khách | Mở `/profile/privacy` | — | Yêu cầu đăng nhập | — | ❌ | ❌ | ❌ | |
| PRV-06 | E | P2 | — | Gửi cùng loại yêu cầu 2 lần | — | Không tạo bản trùng / báo đã có yêu cầu đang chờ | ❌ | — | — | ❌ | Hiện không chặn trùng |
| PRV-07 | H | P1 | Admin | `/admin/privacy` tab "Yêu cầu xóa dữ liệu" → "Xử lý" | — | Trạng thái COMPLETED; nút "Xử lý" biến mất | ❌ | — | ❌ | ✅ | Prod chỉ mở trang |
| PRV-08 | W | P0 | Yêu cầu loại "Toàn bộ tài khoản" đã xử lý | Kiểm tra dữ liệu người dùng | — | Hồ sơ, brand yêu thích, tủ đồ, ảnh upload, lịch sử gợi ý bị xoá; lead của brand chỉ còn số đếm, brand thấy "Khách đã xóa tài khoản"; tài khoản bị vô hiệu | ✅ | — | — | ❌ | Đã sửa #6 (`ec1f64a`). Trước đây: Chỉ xoá ảnh thư viện; hồ sơ, tủ đồ, tài khoản còn nguyên; BE `PrivacyErasureIntegrationTest#deleteAll_erasesPersonalDataAndDisablesAccount`, `BrandLeadIntegrationTest#erasingTheAccountAnonymizesItsLeads` (xem LEAD-12). Brand yêu thích chưa có test |
| PRV-09 | W | P1 | Yêu cầu "Chỉ ảnh đã upload" đã xử lý | Mở link ảnh cũ trực tiếp | — | Ảnh không còn truy cập được (404) | ❌ | — | — | ❌ | |
| PRV-10 | E | P2 | Admin | Xử lý yêu cầu với ID không tồn tại | — | 404 | ✅ | — | — | ✅ | Đã sửa #29 (`ec1f64a`). Trước đây: Hiện trả 500 |
| PRV-11 | H | P2 | Admin | Tab "Nhật ký consent" | — | Cột "Đồng ý" hiển thị đúng Có / Không | ✅ | ❌ | ❌ | ✅ | Đã sửa #30 (`ec1f64a`). Trước đây: FE đọc `granted`, BE trả `accepted` → luôn hiện "Không" |
| PRV-12 | H | P2 | — | Mở `/privacy-policy`, `/terms` | — | Nội dung chính sách hiển thị đầy đủ tiếng Việt | — | — | ✅ | ✅ | smoke-routes |
| PRV-13 | W | P1 | — | User thường gọi `/admin/privacy/*` | — | 403 | ✅ | — | — | ❌ | |
| PRV-14 | E | P2 | — | Người dùng muốn tải xuống dữ liệu của mình | — | Ghi nhận: chưa có tính năng xuất dữ liệu | — | — | — | — | |
| PRV-15 | H | P0 | Đăng nhập, chưa đồng ý chia sẻ với brand | `/profile/privacy` → mục chia sẻ tên và email với brand → "Đồng ý"; sau đó "Rút lại" | — | Trạng thái đổi ngay; toast "Đã đồng ý. Khi bạn bấm mua, brand của sản phẩm sẽ thấy tên và email của bạn." rồi "Đã rút lại đồng ý. Brand sẽ không còn thấy tên và email của bạn." | ✅ | ❌ | ❌ | ❌ | `withdrawingConsentHidesTheCustomerFromTheBrand` (phía BE); xem LEAD-11 |
| PRV-16 | H | P1 | — | Mở `/privacy-policy`, đọc mục "3. Chia sẻ dữ liệu" | — | Có đoạn: chỉ khi đồng ý rõ ràng (ô "Chia sẻ tên và email với brand") tên và email mới được chia sẻ với brand của sản phẩm bấm mua; rút lại trong "Cài đặt quyền riêng tư" (link `/profile/privacy`); xoá tài khoản thì ẩn danh hoá | — | — | ❌ | ❌ | smoke-routes chỉ kiểm tra trang tải |
| PRV-17 | W | P0 | Chưa từng đồng ý chia sẻ với brand | Bấm mua 5 sản phẩm | — | Brand không nhận được tên / email (không tạo lead) | ✅ | — | — | ❌ | `clickWithoutConsentCreatesNoLead`; xem LEAD-02 |
| PRV-18 | E | P1 | Khách chưa đăng nhập | Gọi `POST /privacy/consent` với `BRAND_LEAD_SHARING` theo session, rồi bấm mua | — | Không tạo lead (lead chỉ gắn với người dùng đã đăng nhập) | ❌ | — | — | ❌ | `anonymousClickStillRedirectsButNeverCreatesALead` chỉ phủ trường hợp khách không có consent |

## 9.2 Email & mail relay (MAIL)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MAIL-01 | H | P0 | Relay cấu hình đúng | Kích hoạt mail đặt lại mật khẩu | — | Mail tới hộp thư Gmail (không vào spam), người gửi "FitMe AI" | ✅ | — | — | ✅ | `gmailRelay_isPreferred…`; prod 05/10 |
| MAIL-02 | H | P1 | Chỉ cấu hình Resend | Gửi mã xác minh | — | Gửi qua Resend API | ✅ | — | — | — | `sendVerificationCode_viaResendHttp_postsToApi` |
| MAIL-03 | H | P1 | Chỉ cấu hình SMTP | Gửi mã xác minh | — | Gửi qua SMTP | ✅ | — | — | — | `sendVerificationCode_deliversMessageWithCode` |
| MAIL-04 | W | P0 | — | Gọi `/api/mail-relay` với secret sai | — | 401 "unauthorized" | — | ✅ | — | ✅ | `mail-relay.test checks the shared secret` |
| MAIL-05 | W | P1 | — | Gửi nhiều người nhận / email sai / có dấu phẩy | `a@x.com,b@y.com` | 400 "invalid recipient" | — | ✅ | — | ❌ | "rejects bulk or malformed recipients" |
| MAIL-06 | W | P1 | — | Tiêu đề có xuống dòng (chèn header) / > 200 ký tự | `"Hi\r\nBcc: x@y.com"` | Xuống dòng bị gộp; > 200 → "invalid subject" | — | ✅ | — | ❌ | "accepts one recipient and sanitises headers" |
| MAIL-07 | W | P2 | — | Nội dung > 200.000 ký tự | — | "invalid text" | — | ❌ | — | ❌ | |
| MAIL-08 | W | P2 | — | Gửi JSON hỏng | — | 400 "invalid json" | — | ❌ | — | ❌ | |
| MAIL-09 | W | P1 | Chưa cấu hình `GMAIL_USER` | Gọi relay | — | 503 "relay not configured" | — | ❌ | — | ❌ | |
| MAIL-10 | W | P1 | Gmail từ chối (sai app password) | Gọi relay | — | 502 "send failed"; backend báo lỗi thân thiện | ✅ | ❌ | — | ❌ | |
| MAIL-13 | H | P1 | — | Mua Premium | — | Email "FitMe · Gói Premium đã được kích hoạt", có dòng "Hiệu lực Premium đến: …" | ✅ | — | — | ❌ | `premiumCheckout_sendsPlanPurchasedEmail` |
| MAIL-15 | W | P1 | Gửi > 500 mail / ngày | — | — | Có cảnh báo / phương án dự phòng khi hết quota Gmail | ❌ | — | — | ❌ | Gmail giới hạn ~500 mail/ngày |
| MAIL-16 | H | P2 | — | Mở email trên điện thoại / Gmail tối màu | — | Hiển thị đẹp, link bấm được | — | — | — | ❌ | |
| MAIL-17 | E | P2 | — | Kiểm tra tiếng Việt có dấu trong tiêu đề | — | Không lỗi font | — | — | — | ✅ | |
