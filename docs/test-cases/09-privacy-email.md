# 09 · Quyền riêng tư & email (PRV / MAIL)

[← Mục lục](../TEST_CASES.md)

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Consent | Loại: PRIVACY_NOTICE, PHOTO_UPLOAD, WARDROBE_IMAGE_UPLOAD, AI_PREVIEW; phiên bản "2026-01". Chỉ cần **một** bản ghi đồng ý là đủ — gửi `accepted:false` sau đó **không thu hồi** được |
| Yêu cầu xoá | Trang `/profile/privacy` có 3 lựa chọn: "Dữ liệu session / tư vấn", "Chỉ ảnh đã upload", "Toàn bộ tài khoản" (chọn này sẽ đăng xuất sau 2 giây). Admin bấm "Xử lý" → **chỉ xoá ảnh thư viện** (với loại ALL / PHOTO_UPLOAD), rồi đánh dấu COMPLETED |
| Email | Ưu tiên: relay HTTPS (Vercel `/api/mail-relay` → Gmail) → Resend → SMTP. Relay xác thực bằng `secret` trong body; 1 người nhận; tiêu đề ≤ 200 ký tự; nội dung ≤ 200.000 ký tự |
| Email được gửi | Mã xác minh, link đặt lại mật khẩu, xác nhận đơn (COD / PayOS), kích hoạt Pro / cộng Fitken. **Không** gửi: chào mừng, đổi mật khẩu, khoá tài khoản, xử lý xoá dữ liệu, giao hàng |

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
| PRV-08 | W | P0 | Yêu cầu loại "Toàn bộ tài khoản" đã xử lý | Kiểm tra dữ liệu người dùng | — | Hồ sơ, tủ đồ, ảnh upload, lịch sử gợi ý bị xoá; tài khoản bị vô hiệu | ✅ | — | — | ❌ | Đã sửa #6 (`ec1f64a`). Trước đây: Chỉ xoá ảnh thư viện; hồ sơ, tủ đồ, tài khoản còn nguyên; BE `PrivacyErasureIntegrationTest#deleteAll_erasesPersonalDataAndDisablesAccount` |
| PRV-09 | W | P1 | Yêu cầu "Chỉ ảnh đã upload" đã xử lý | Mở link ảnh cũ trực tiếp | — | Ảnh không còn truy cập được (404) | ❌ | — | — | ❌ | |
| PRV-10 | E | P2 | Admin | Xử lý yêu cầu với ID không tồn tại | — | 404 | ✅ | — | — | ✅ | Đã sửa #29 (`ec1f64a`). Trước đây: Hiện trả 500 |
| PRV-11 | H | P2 | Admin | Tab "Nhật ký consent" | — | Cột "Đồng ý" hiển thị đúng Có / Không | ✅ | ❌ | ❌ | ✅ | Đã sửa #30 (`ec1f64a`). Trước đây: FE đọc `granted`, BE trả `accepted` → luôn hiện "Không" |
| PRV-12 | H | P2 | — | Mở `/privacy-policy`, `/terms` | — | Nội dung chính sách hiển thị đầy đủ tiếng Việt | — | — | ✅ | ✅ | smoke-routes |
| PRV-13 | W | P1 | — | User thường gọi `/admin/privacy/*` | — | 403 | ✅ | — | — | ❌ | |
| PRV-14 | E | P2 | — | Người dùng muốn tải xuống dữ liệu của mình | — | Ghi nhận: chưa có tính năng xuất dữ liệu | — | — | — | — | |

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
| MAIL-11 | H | P1 | — | Đặt đơn COD | — | Email "FitMe · Đơn hàng {mã} đã được xác nhận" gửi **sau** khi giao dịch commit, đúng 1 lần | ✅ | — | — | ❌ | `codOrder_sendsConfirmationAfterCommit` |
| MAIL-12 | H | P1 | — | Đơn PayOS: chưa trả rồi trả | — | Chỉ gửi email khi đã trả | ✅ | — | — | ❌ | `payosOrder_sendsConfirmationOnlyOncePaid` |
| MAIL-13 | H | P1 | — | Mua Pro | — | Email "FitMe · Gói Pro đã được kích hoạt" | ✅ | — | — | ❌ | `proCheckout_sendsPlanPurchasedEmail` |
| MAIL-14 | W | P1 | Gửi email đơn hàng lỗi | Đặt đơn | — | Đơn vẫn tạo thành công (email lỗi không làm hỏng giao dịch) | ❌ | — | — | ❌ | |
| MAIL-15 | W | P1 | Gửi > 500 mail / ngày | — | — | Có cảnh báo / phương án dự phòng khi hết quota Gmail | ❌ | — | — | ❌ | Gmail giới hạn ~500 mail/ngày |
| MAIL-16 | H | P2 | — | Mở email trên điện thoại / Gmail tối màu | — | Hiển thị đẹp, link bấm được | — | — | — | ❌ | |
| MAIL-17 | E | P2 | — | Kiểm tra tiếng Việt có dấu trong tiêu đề | — | Không lỗi font | — | — | — | ✅ | |
