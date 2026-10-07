# 01 · Xác thực & tài khoản (AUTH)

[← Mục lục](../TEST_CASES.md)

Phạm vi: đăng ký, xác minh email, đăng nhập, token & phiên, quên / đặt lại mật khẩu, đổi mật khẩu, đăng nhập portal Admin / Brand.

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Đăng ký | Họ tên ≥ 2 ký tự (chỉ FE); email hợp lệ; mật khẩu ≥ 6 ký tự, **không có giới hạn trên và không yêu cầu độ phức tạp**; xác nhận mật khẩu phải khớp |
| Chống spam | Captcha phép cộng `a + b` (a 2–9, b 1–9), hiệu lực 10 phút, **dùng một lần** (sai cũng bị huỷ); honeypot ẩn `website`; form phải mở ≥ 2 giây và ≤ 24 giờ; cooldown đăng ký 60 giây / email |
| Mã xác minh | 6 chữ số, hiệu lực 30 phút; sai 5 lần thì mã bị huỷ; gửi lại cách nhau ≥ 60 giây |
| Đăng nhập | Sai mật khẩu và email không tồn tại cùng trả 401 "Email hoặc mật khẩu không đúng"; tài khoản bị khoá trả 400 `ACCOUNT_LOCKED`; chưa xác minh trả 400. **Không có chống brute-force** |
| Token | Access 1 giờ, refresh 7 ngày; refresh cấp cặp token mới nhưng **không thu hồi refresh token cũ**; đăng xuất thu hồi refresh token, access token còn hiệu lực tới khi hết hạn |
| Quên mật khẩu | Luôn trả cùng một thông báo; link hiệu lực 60 phút, vô hiệu ngay khi mật khẩu đổi; cooldown im lặng 60 giây |
| Đổi mật khẩu | Mật khẩu mới 8–100 ký tự, phải khác mật khẩu cũ; đăng xuất mọi phiên khác, trả token mới cho phiên hiện tại |
| Portal | Cookie httpOnly `fitme-access` + `fitme-role` sống 24 giờ; middleware chặn `/admin/*` (cần ADMIN) và `/brand/*` (cần BRAND, trừ `login`, `onboarding`, `pending`) |

---

## 1.1 Đăng ký (AUTH-REG)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-REG-01 | H | P0 | Email chưa có tài khoản | 1. Mở `/auth/register`<br>2. Nhập họ tên, email, mật khẩu, xác nhận<br>3. Giải captcha<br>4. Chờ > 2 giây rồi bấm "Đăng ký" | Họ tên `QA Tester`, email `qa+<giờ>@gmail.com`, mật khẩu `Test@1234` | Chuyển sang `/auth/verify-email?email=…`; thông báo "Đăng ký thành công. Kiểm tra email và nhập mã xác nhận…"; email chứa mã 6 số tới hộp thư; **chưa** cấp token | ✅ | — | ✅ | ❌ | `register_requiresVerificationThenIssuesTokens`; role-flows. Prod cố ý chưa tạo tài khoản mới |
| AUTH-REG-02 | H | P1 | — | Mở `/auth/register` | — | Có các trường Họ tên, Email, Mật khẩu, Xác nhận mật khẩu, câu hỏi captcha `a + b = ?`, nút "Đổi câu hỏi", link "Đăng nhập" | — | — | ✅ | ✅ | auth-flow, auth-pages |
| AUTH-REG-03 | E | P2 | — | Nhập họ tên 1 ký tự, điền đủ các trường khác, bấm "Đăng ký" | `A` | Lỗi "Họ tên tối thiểu 2 ký tự" dưới ô; không gọi API | — | ❌ | ❌ | ❌ | |
| AUTH-REG-04 | E | P1 | — | Nhập lần lượt các email sai, bấm "Đăng ký" | `abc`, `abc@`, `@gmail.com`, `a b@gmail.com` | Lỗi "Email không hợp lệ"; không gọi API | — | ❌ | ❌ | ✅ | Prod 05/10 |
| AUTH-REG-05 | E | P1 | — | Nhập mật khẩu 5 ký tự | `12345` | Lỗi "Mật khẩu tối thiểu 6 ký tự" | — | ❌ | ❌ | ❌ | |
| AUTH-REG-06 | E | P2 | — | Nhập mật khẩu đúng 6 ký tự (biên dưới) | `123456` | Được chấp nhận, đăng ký thành công | ❌ | ❌ | ❌ | ❌ | |
| AUTH-REG-07 | E | P1 | — | Nhập xác nhận mật khẩu khác mật khẩu | `Test@1234` / `Test@12345` | Lỗi "Mật khẩu không khớp" ở ô xác nhận | — | ❌ | ❌ | ✅ | Prod 05/10 |
| AUTH-REG-08 | E | P2 | — | Bỏ trống ô đáp án captcha | — | Lỗi "Nhập đáp án xác nhận" | — | ❌ | ❌ | ❌ | |
| AUTH-REG-09 | E | P1 | — | Nhập sai đáp án captcha | Câu `3 + 4 = ?`, nhập `8` | Lỗi "Đáp án xác nhận không đúng"; ô đáp án bị xoá; câu hỏi mới được tải; không tạo tài khoản | ❌ | — | ❌ | ❌ | |
| AUTH-REG-10 | E | P2 | — | Nhập đáp án không phải số (gọi API trực tiếp) | `captchaAnswer: "bảy"` | 400 "Đáp án xác nhận không hợp lệ" | ❌ | — | — | ❌ | |
| AUTH-REG-11 | W | P2 | — | Mở form, để quá 10 phút rồi mới submit | — | "Mã xác nhận đã hết hạn. Tải lại câu hỏi và thử lại."; captcha mới được tải | ❌ | — | ❌ | ❌ | |
| AUTH-REG-12 | W | P1 | Có 1 captcha đã dùng | Gọi `POST /auth/register` lần 2 với cùng `captchaId` | — | Lần 2 báo "Mã xác nhận đã hết hạn…" (captcha chỉ dùng 1 lần) | ❌ | — | — | ❌ | Chống bot giải 1 lần dùng nhiều lần |
| AUTH-REG-13 | H | P2 | — | Bấm "Đổi câu hỏi" | — | Câu hỏi mới và `captchaId` mới được tải | — | ❌ | ❌ | ❌ | |
| AUTH-REG-14 | W | P2 | Backend tắt hoặc lỗi `/auth/captcha` | Mở `/auth/register` | — | Thông báo "Không tải được xác nhận chống spam"; không crash | — | ❌ | ❌ | ❌ | |
| AUTH-REG-15 | E | P1 | Email đã có tài khoản đã xác minh | Đăng ký lại bằng email đó | `khangntse180776@fpt.edu.vn` | "Email đã được sử dụng"; không gửi mail | ❌ | — | ❌ | ❌ | Lưu ý: thông báo này cho biết email đã tồn tại |
| AUTH-REG-16 | E | P1 | Email đã đăng ký nhưng **chưa** xác minh | Đăng ký lại bằng email đó | — | "Email đã được sử dụng"; người dùng cần vào trang xác minh để "Gửi lại mã" | ❌ | — | ❌ | ❌ | UX: không có gợi ý chuyển sang trang xác minh |
| AUTH-REG-17 | E | P2 | Lần đăng ký đầu thất bại do lỗi gửi mail | Đăng ký lại cùng email trong 60 giây | — | "Bạn vừa đăng ký email này. Vui lòng đợi một phút rồi thử lại." | ❌ | — | ❌ | ❌ | |
| AUTH-REG-18 | W | P1 | — | Gọi API với trường ẩn `website` có giá trị | `website: "http://spam.com"` | 400 "Đăng ký bị từ chối"; không tạo tài khoản | ✅ | — | ❌ | ❌ | `register_rejectsHoneypot` |
| AUTH-REG-19 | W | P1 | `FITME_AUTH_MIN_FORM_MS` = 2000 | Gọi API với `formStartedAtMs` = thời điểm hiện tại | — | 400 "Đăng ký quá nhanh. Vui lòng thử lại." | ❌ | — | ❌ | ❌ | CI đặt 0 nên không kiểm tra được |
| AUTH-REG-20 | W | P2 | — | Gọi API không gửi `formStartedAtMs` | — | 400 "Thiếu xác nhận chống spam. Tải lại trang và thử lại." | ❌ | — | — | ❌ | |
| AUTH-REG-21 | W | P2 | — | Gọi API với `formStartedAtMs` cũ hơn 24 giờ | `Date.now() - 90000000` | 400 "Phiên đăng ký đã hết hạn. Tải lại trang và thử lại." | ❌ | — | — | ❌ | |
| AUTH-REG-22 | E | P2 | — | Đăng ký với email chữ hoa và khoảng trắng đầu cuối, sau đó đăng nhập bằng chữ thường | `"  QA.Test@Gmail.COM "` | Email được lưu chữ thường, đã trim; đăng nhập bằng `qa.test@gmail.com` thành công | ❌ | — | ❌ | ❌ | |
| AUTH-REG-23 | E | P2 | — | Gọi API với `displayName` rỗng | — | Tạo tài khoản, tên hiển thị = email | ❌ | — | — | ❌ | |
| AUTH-REG-24 | W | P2 | — | Gọi API với họ tên > 255 ký tự | Chuỗi 300 ký tự | 400 với thông báo độ dài hợp lệ; **không** 500 | ✅ | — | — | ✅ | Đã sửa #38 (`934b924`). Trước đây: Hiện trả 409 "Dữ liệu bị trùng…" (lỗi ràng buộc DB) |
| AUTH-REG-25 | W | P2 | — | Gọi API với mật khẩu 10.000 ký tự | — | Bị từ chối (giới hạn ≤ 100 như khi đặt lại mật khẩu) | ✅ | — | — | ✅ | Đã sửa #39 (`934b924`). Trước đây: Đăng ký không có giới hạn trên |
| AUTH-REG-26 | W | P1 | Chưa cấu hình relay / Resend / SMTP, tắt expose code | Đăng ký | — | "Hệ thống chưa cấu hình gửi email…"; không tạo tài khoản (rollback) | ✅ | — | — | ❌ | `sendVerificationCode_withoutSmtp_andExposeOff_fails` |
| AUTH-REG-27 | W | P1 | Relay Gmail từ chối gửi | Đăng ký | — | "Hiện chưa gửi được email tới địa chỉ này…"; không lộ tên biến môi trường hay mã lỗi nhà cung cấp | ✅ | — | — | ❌ | `gmailRelay_rejection_surfacesFriendlyError` |
| AUTH-REG-28 | H | P1 | — | Mở `/auth/register?redirect=/try-on`, đăng ký, xác minh | — | Sau xác minh chuyển về `/try-on` | — | ❌ | ❌ | ❌ | |
| AUTH-REG-29 | W | P1 | — | Mở `/auth/register?redirect=//evil.com` rồi đăng ký, xác minh | `//evil.com`, `https://evil.com` | Redirect bị bỏ qua, về `/profile`; không rời khỏi domain FitMe | — | ❌ | ❌ | ❌ | Code có làm sạch: phải bắt đầu bằng `/` và không phải `//` |
| AUTH-REG-30 | H | P2 | — | Mở `/?utm_source=facebook&utm_campaign=launch`, rồi đăng ký | — | `signup_source = facebook`; admin thấy nguồn này ở "Phân tích tăng trưởng" | ✅ | ✅ | ❌ | ❌ | `attribution.test`; `metricsCountActiveUsersSignupSourcesAndFunnel` |
| AUTH-REG-31 | W | P1 | — | Bấm "Đăng ký" 2 lần thật nhanh | — | Nút bị khoá khi đang gửi; chỉ 1 tài khoản; lần 2 (nếu có) nhận cooldown | ❌ | ❌ | ❌ | ❌ | |
| AUTH-REG-32 | W | P2 | — | Nhập họ tên chứa HTML | `<img src=x onerror=alert(1)>` | Tên hiển thị như văn bản ở header / hồ sơ / admin, không chạy script | ❌ | ❌ | ❌ | ❌ | Xem thêm SEC-XSS |

## 1.2 Xác minh email (AUTH-VER)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-VER-01 | H | P0 | Vừa đăng ký, có mã trong mail | Nhập email + mã 6 số đúng, bấm xác minh | — | Tài khoản kích hoạt; nhận token; session ẩn danh được liên kết; chuyển tới `redirect` hoặc `/profile`; tài khoản mới có 5 Fitken | ✅ | — | ✅ | ❌ | `register_requiresVerificationThenIssuesTokens` |
| AUTH-VER-02 | E | P2 | — | Để trống email hoặc mã | — | Nút xác minh bị vô hiệu | — | ❌ | ❌ | ❌ | |
| AUTH-VER-03 | E | P1 | Tài khoản chờ xác minh | Nhập sai mã 1–4 lần | `000000` | Mỗi lần: "Mã xác thực không hợp lệ" | ✅ | — | ❌ | ❌ | |
| AUTH-VER-04 | W | P0 | Đã sai 4 lần | Nhập sai lần 5, rồi nhập mã đúng | — | Lần 5: "Nhập sai mã quá nhiều lần. Hãy yêu cầu gửi lại mã mới."; mã đúng sau đó: "Mã xác thực đã hết hiệu lực…" | ✅ | — | ❌ | ❌ | `verifyEmail_tooManyWrongCodes_burnsTheCode` |
| AUTH-VER-05 | E | P1 | Mã đã quá 30 phút | Nhập mã đúng | — | "Mã xác thực đã hết hạn. Hãy yêu cầu gửi lại mã." | ❌ | — | ❌ | ❌ | |
| AUTH-VER-06 | E | P2 | — | Nhập email chưa đăng ký + mã bất kỳ | — | "Mã xác thực không hợp lệ" | ❌ | — | — | ❌ | |
| AUTH-VER-07 | W | P0 | Tài khoản đã xác minh | Gọi verify-email lần nữa | — | "Email này đã được xác minh. Vui lòng đăng nhập."; **không** cấp token | ✅ | — | — | ❌ | `verifyEmail_onVerifiedAccount_neverIssuesTokens` |
| AUTH-VER-08 | E | P2 | — | Gọi API thiếu email | — | 400 | ✅ | — | — | ❌ | `verifyEmail_requiresEmail` |
| AUTH-VER-09 | H | P1 | Tài khoản chờ xác minh, đã qua 60 giây | Bấm "Gửi lại mã" | — | "…mã mới đã được gửi tới hộp thư."; mã cũ hết hiệu lực; bộ đếm sai về 0 | ❌ | — | ❌ | ❌ | |
| AUTH-VER-10 | E | P2 | Vừa gửi lại mã | Bấm "Gửi lại mã" trong 60 giây | — | "Vui lòng đợi 1 phút trước khi gửi lại mã." | ❌ | — | ❌ | ❌ | UX: FE không có đếm ngược |
| AUTH-VER-11 | E | P2 | — | Xoá email, bấm "Gửi lại mã" | — | "Nhập email để nhận lại mã" | — | ❌ | ❌ | ❌ | |
| AUTH-VER-12 | W | P2 | — | Gửi lại mã cho email không tồn tại và cho email đang chờ xác minh, so sánh thông báo | — | Hai thông báo giống hệt nhau (không lộ trạng thái tài khoản) | ✅ | — | — | ✅ | Đã sửa #37 (`934b924`). Trước đây: Hiện khác nhau: "…đã được tạo" và "…đã được gửi tới hộp thư" |
| AUTH-VER-13 | W | P2 | Đã sai 3 lần | Restart backend, nhập sai tiếp | — | Ghi nhận: bộ đếm lưu trong bộ nhớ nên bị reset sau restart | ❌ | — | — | ❌ | Rủi ro: tăng số lần đoán |
| AUTH-VER-14 | H | P1 | — | Mở email xác minh | — | Tiêu đề "Xác nhận email · Bắt đầu thử mặc với FitMe AI"; có mã, thời hạn 30 phút, link `/auth/verify-email?email=` mở trang đã điền sẵn email | ✅ | — | — | ❌ | `sendVerificationCode_deliversMessageWithCode` |

## 1.3 Đăng nhập người dùng (AUTH-LOG)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-LOG-01 | H | P0 | Tài khoản đã xác minh | Mở `/auth/login`, nhập đúng, bấm "Đăng nhập" | Tài khoản test user | Nhận token; chuyển tới `redirect` hoặc `/profile`; header hiện tên, số Fitken | ✅ | ✅ | ✅ | ✅ | `login_validCredentials_returnsTokens`, `auth-api.test` |
| AUTH-LOG-02 | E | P0 | — | Nhập đúng email, sai mật khẩu | `wrongpass` | 401 "Email hoặc mật khẩu không đúng" | ✅ | ✅ | ✅ | ✅ | `user-error-message.test`; auth-flow "invalid login"; BE `P0AuthIntegrationTest#login_wrongPasswordForExistingEmail_returns401WithGenericMessage` |
| AUTH-LOG-03 | E | P1 | — | Nhập email chưa đăng ký | `noone@fitme.ai` | Cùng thông báo như sai mật khẩu | ❌ | — | ❌ | ❌ | Chống dò email |
| AUTH-LOG-04 | E | P2 | — | Nhập email sai định dạng | `abc@` | "Email không hợp lệ"; không gọi API | — | ❌ | ❌ | ❌ | |
| AUTH-LOG-05 | E | P2 | — | Nhập mật khẩu 5 ký tự | `12345` | "Mật khẩu tối thiểu 6 ký tự"; không gọi API | — | ❌ | ❌ | ❌ | |
| AUTH-LOG-06 | E | P1 | Tài khoản chưa xác minh | Đăng nhập đúng mật khẩu | — | 400 "Tài khoản chưa xác nhận email. Vui lòng nhập mã xác minh trước khi đăng nhập." | ❌ | — | ❌ | ❌ | UX: không có nút chuyển tới trang xác minh |
| AUTH-LOG-07 | W | P0 | Admin đã khoá tài khoản | Đăng nhập đúng mật khẩu | `user@fitme.ai` | 400 "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ FitMe để được hỗ trợ." | ✅ | — | ❌ | ✅ | `adminSearchesAccountsAndLockingSignsTheUserOut`; prod 05/10 |
| AUTH-LOG-08 | W | P1 | Tài khoản bị khoá | Đăng nhập **sai** mật khẩu | — | 401 thông báo chung (không lộ việc bị khoá) | ❌ | — | — | ❌ | |
| AUTH-LOG-09 | E | P2 | — | Đăng nhập với email viết hoa và khoảng trắng | `" KHANGNTSE180776@FPT.EDU.VN "` | Đăng nhập thành công | ❌ | — | ❌ | ❌ | |
| AUTH-LOG-10 | W | P0 | — | Gửi 100 lần sai mật khẩu cho cùng 1 email trong 1 phút | Script | Bị giới hạn tần suất / tạm khoá / yêu cầu captcha | ✅ | — | — | ✅ | Đã sửa #4 (`934b924`). Trước đây: Không có cơ chế chống brute-force; BE `AuthControllerTest#login_locksEmailAfterFiveWrongPasswords` |
| AUTH-LOG-11 | W | P1 | — | Mở `/auth/login?redirect=https://evil.com`, đăng nhập | — | Không bị chuyển ra domain ngoài | — | ✅ | ❌ | ❌ | Đã sửa #12 (`934b924`). Trước đây: Cần kiểm chứng: `use-auth-redirect` không làm sạch tham số redirect |
| AUTH-LOG-12 | H | P1 | — | Đăng nhập xong, bấm "Quay lại" trên trang đích | — | Không quay về trang đăng nhập; về Trang chủ hoặc trang trước đó | — | ✅ | — | ✅ | `nav-history.test "never offers login…"`; sửa ở `ee9d956` |
| AUTH-LOG-13 | H | P2 | — | Bấm "Quên mật khẩu?" và "Đăng ký" | — | Mở đúng `/auth/forgot-password`, `/auth/register` | — | — | ✅ | ✅ | auth-flow |
| AUTH-LOG-14 | W | P1 | — | Bấm "Đăng nhập" liên tục / Enter nhiều lần | — | Nút khoá khi đang gửi; không tạo nhiều phiên lỗi | — | ❌ | ❌ | ❌ | |
| AUTH-LOG-15 | H | P0 | Khách đã tư vấn ẩn danh (hồ sơ, gợi ý đã lưu, tủ đồ, thử mặc) | Đăng nhập | — | Dữ liệu ẩn danh chuyển sang tài khoản; vẫn thấy trong "Đã lưu", "Tủ đồ", hồ sơ | ✅ | — | ❌ | ❌ | `SessionServiceTest.linkToUser_migratesSessionDataToUser` |
| AUTH-LOG-16 | W | P1 | Tắt mạng | Bấm "Đăng nhập" | — | "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại." | — | ✅ | ❌ | ❌ | `user-error-message.test` (network) |
| AUTH-LOG-17 | W | P1 | Backend Render đang ngủ | Đăng nhập lần đầu sau lâu không dùng | — | Hiện trạng thái chờ; nếu quá 30 giây thì báo timeout và cho thử lại; không treo UI | — | ❌ | — | ❌ | Khởi động lạnh đo được ~3 phút |

## 1.4 Token, phiên & đăng xuất (AUTH-TOK)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-TOK-01 | H | P0 | Đã đăng nhập, access token hết hạn (sửa `exp` hoặc chờ 1 giờ) | Thao tác bất kỳ cần đăng nhập | — | Client tự refresh, gửi lại request; người dùng không bị đăng xuất | ❌ | ✅ | ❌ | ❌ | `jwt-expiry.test` chỉ kiểm tra hàm hết hạn |
| AUTH-TOK-02 | E | P0 | Refresh token hết hạn (> 7 ngày) | Mở trang cần đăng nhập | — | Xoá token, header về trạng thái khách, chuyển tới đăng nhập | — | ❌ | ❌ | ❌ | |
| AUTH-TOK-03 | W | P1 | Access token hết hạn | Mở trang gọi 5 API cùng lúc | — | Chỉ 1 lần gọi `/auth/refresh-token`; cả 5 request được gửi lại thành công | — | ❌ | ❌ | ❌ | |
| AUTH-TOK-04 | H | P0 | Đã đăng nhập | Bấm "Đăng xuất" | — | Gọi `/auth/logout`; xoá token localStorage; xoá cookie portal; reset tư vấn; header về khách | ✅ | ✅ | ❌ | ❌ | `auth-store.test clearAuth`; BE `P0AuthIntegrationTest#logout_revokesRefreshToken` |
| AUTH-TOK-05 | W | P1 | Đã đăng xuất, giữ lại refresh token | Gọi `/auth/refresh-token` với token đó | — | 400 "Refresh token không hợp lệ" | ❌ | — | — | ❌ | |
| AUTH-TOK-06 | W | P1 | Đã refresh 1 lần | Dùng lại refresh token **cũ** | — | Bị từ chối (xoay vòng refresh token) | ✅ | — | — | ✅ | Đã sửa #5 (`934b924`). Trước đây: Hiện token cũ vẫn dùng được tới khi hết hạn |
| AUTH-TOK-07 | W | P2 | Đã đăng xuất, giữ access token | Gọi API bằng access token đó | — | Ghi nhận: còn dùng được tối đa 1 giờ (thiết kế stateless) | ❌ | — | — | ❌ | Rủi ro chấp nhận được, cần ghi rõ |
| AUTH-TOK-08 | W | P1 | — | Dùng refresh token làm `Authorization: Bearer` | — | Không được xác thực (403) | ❌ | — | — | ❌ | Chỉ token `type=access` được chấp nhận |
| AUTH-TOK-09 | E | P2 | Đăng nhập ở 2 tab | Đăng xuất ở tab A, thao tác ở tab B | — | Tab B về trạng thái khách khi gọi API, không lỗi trắng trang | — | ❌ | ❌ | ❌ | |
| AUTH-TOK-10 | W | P2 | Đã đăng nhập | Xoá localStorage bằng DevTools, tải lại | — | App không crash, về trạng thái khách | — | ❌ | ❌ | ❌ | |
| AUTH-TOK-11 | W | P1 | Đã đăng nhập | Admin khoá tài khoản; người dùng tiếp tục thao tác | — | Request tiếp theo bị từ chối; refresh trả `ACCOUNT_LOCKED`; người dùng bị đăng xuất | ✅ | ❌ | ❌ | ✅ | Prod 05/10 với `user@fitme.ai` |

## 1.5 Quên & đặt lại mật khẩu (AUTH-PWD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-PWD-01 | H | P0 | Tài khoản tồn tại | Mở `/auth/forgot-password`, nhập email, gửi | Tài khoản test user | Thông báo đã gửi "(hiệu lực 60 phút)"; mail "Đặt lại mật khẩu FitMe AI" có link `/auth/reset-password?token=…` | ✅ | — | ✅ | ✅ | `sendPasswordResetLink_deliversLinkToResetPage`; prod nhận mail qua Gmail relay |
| AUTH-PWD-02 | E | P1 | — | Nhập email chưa đăng ký | `noone@fitme.ai` | Cùng thông báo như email tồn tại; không gửi mail | ❌ | — | ❌ | ❌ | |
| AUTH-PWD-03 | E | P2 | — | Nhập email sai định dạng | `abc` | Lỗi định dạng email | ❌ | ❌ | ❌ | ❌ | |
| AUTH-PWD-04 | E | P2 | Vừa yêu cầu | Yêu cầu lại trong 60 giây | — | Vẫn báo thành công; không gửi mail thứ hai | ❌ | — | — | ❌ | Cooldown im lặng |
| AUTH-PWD-05 | W | P1 | Backend lỗi / tắt | Gửi form | — | Thông báo lỗi thân thiện, cho thử lại | — | ✅ | ❌ | ❌ | Đã sửa #28 (`d88f285`). Trước đây: Trang không có `catch`, lỗi không hiển thị gì |
| AUTH-PWD-06 | H | P0 | Có link hợp lệ | 1. Mở link (token điền sẵn)<br>2. Nhập mật khẩu mới + xác nhận<br>3. Gửi<br>4. Đăng nhập bằng mật khẩu mới, rồi mật khẩu cũ | `NewPass@1` | "Mật khẩu đã được cập nhật. Đang chuyển đến trang đăng nhập..."; sau 2 giây về `/auth/login`; mật khẩu mới đăng nhập được, mật khẩu cũ bị từ chối | ✅ | — | ✅ | ❌ | `resetPassword_withValidToken_updatesPassword`; reset-password.spec |
| AUTH-PWD-07 | W | P0 | Đã dùng link 1 lần | Mở lại link và đặt mật khẩu | — | "Link đặt lại mật khẩu không hợp lệ, đã hết hạn hoặc đã được sử dụng" | ✅ | — | ❌ | ❌ | `resetPassword_tokenWorksOnceAndOldPasswordStopsWorking` |
| AUTH-PWD-08 | W | P1 | Link quá 60 phút | Đặt mật khẩu | — | Cùng thông báo như AUTH-PWD-07 | ❌ | — | ❌ | ❌ | |
| AUTH-PWD-09 | E | P1 | — | Sửa vài ký tự trong token rồi gửi | — | 400 cùng thông báo | ✅ | — | ❌ | ❌ | `resetPassword_withInvalidToken_returnsBadRequest` |
| AUTH-PWD-10 | W | P0 | Có access token | Dùng access token làm token reset | — | Bị từ chối | ✅ | — | — | ❌ | `resetPassword_rejectsAccessTokenAsResetToken` |
| AUTH-PWD-11 | W | P1 | — | Yêu cầu link 1, chờ 60 giây, yêu cầu link 2; dùng link 2 rồi dùng link 1 | — | Link 1 bị từ chối (mật khẩu đã đổi) | ❌ | — | — | ❌ | |
| AUTH-PWD-12 | E | P2 | Có link hợp lệ | Nhập mật khẩu 5 ký tự; gọi API với 101 ký tự | — | FE: "Mật khẩu tối thiểu 6 ký tự"; API: 400 | ❌ | ❌ | ❌ | ❌ | FE không giới hạn trên |
| AUTH-PWD-13 | E | P2 | Có link hợp lệ | Đặt mật khẩu mới trùng mật khẩu cũ | — | Được chấp nhận (không bắt buộc khác) | ❌ | — | — | ❌ | Khác với đổi mật khẩu trong hồ sơ |
| AUTH-PWD-14 | W | P0 | Đang đăng nhập ở thiết bị B | Đặt lại mật khẩu ở thiết bị A | — | Thiết bị B bị đăng xuất (access và refresh token cũ mất hiệu lực) | ✅ | — | ❌ | ❌ | BE `P0AuthIntegrationTest#resetPassword_signsOutOtherDevices` |
| AUTH-PWD-15 | E | P2 | — | Mở `/auth/reset-password` không có token | — | Ô token trống; gửi thì báo "Nhập token" | — | ❌ | ❌ | ❌ | |

## 1.6 Đổi mật khẩu khi đã đăng nhập (AUTH-CHP)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-CHP-01 | H | P0 | Đăng nhập ở 2 thiết bị | Ở thiết bị A vào `/profile/password`, nhập đúng mật khẩu hiện tại + mật khẩu mới hợp lệ | `NewPass@123` | Toast "Đã đổi mật khẩu"; dòng "Mật khẩu đã được cập nhật."; thiết bị A vẫn đăng nhập; thiết bị B bị đăng xuất | ✅ | — | ❌ | ❌ | `changePassword_rotatesTokens_andSignsOutOtherSessions` |
| AUTH-CHP-02 | E | P1 | — | Nhập sai mật khẩu hiện tại | — | "Mật khẩu hiện tại không đúng" | ❌ | — | ❌ | ❌ | |
| AUTH-CHP-03 | E | P1 | — | Mật khẩu mới 7 ký tự | `1234567` | "Mật khẩu mới tối thiểu 8 ký tự" | ❌ | ❌ | ❌ | ❌ | Không nhất quán: đăng ký chỉ cần 6 ký tự |
| AUTH-CHP-04 | E | P2 | — | Mật khẩu mới 101 ký tự | — | "Mật khẩu tối đa 100 ký tự" | ❌ | ❌ | — | ❌ | |
| AUTH-CHP-05 | E | P1 | — | Mật khẩu mới trùng mật khẩu hiện tại | — | "Mật khẩu mới phải khác mật khẩu hiện tại" | ❌ | ❌ | ❌ | ❌ | |
| AUTH-CHP-06 | E | P2 | — | Xác nhận không khớp | — | "Mật khẩu không khớp" | — | ❌ | ❌ | ❌ | |
| AUTH-CHP-07 | E | P1 | Chưa đăng nhập | Mở `/profile/password`; gọi `POST /me/password` | — | Trang yêu cầu đăng nhập; API bị chặn (403) | ✅ | — | ❌ | ❌ | `changePassword_requiresAuthentication` |
| AUTH-CHP-08 | H | P2 | — | Bấm biểu tượng ẩn/hiện mật khẩu | — | Chuyển đổi hiển thị ký tự | — | ❌ | ❌ | ❌ | |
| AUTH-CHP-09 | H | P1 | Đăng nhập admin / brand | Đổi mật khẩu ở `/admin/account` và `/brand/settings` | — | Hoạt động như người dùng; đăng nhập lại portal bằng mật khẩu mới | ✅ | — | ❌ | ❌ | Prod chỉ mở trang |
| AUTH-CHP-10 | W | P1 | Thiết bị B còn refresh token cũ | Sau khi đổi mật khẩu ở A, B gọi refresh | — | "Mật khẩu đã được đổi. Vui lòng đăng nhập lại" | ✅ | — | — | ❌ | |

## 1.7 Đăng nhập portal Admin / Brand (AUTH-POR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-POR-01 | H | P0 | — | Mở `/admin/login`, đăng nhập admin | `admin@fitme.ai` | Đặt cookie `fitme-access`, `fitme-role`; vào `/admin/dashboard` | — | — | ✅ | ✅ | role-flows portal |
| AUTH-POR-02 | H | P0 | — | Mở `/brand/login`, đăng nhập brand | `brand@fitme.ai` | Vào `/brand/dashboard` | — | — | ✅ | ✅ | |
| AUTH-POR-03 | E | P1 | — | Đăng nhập `/admin/login` bằng tài khoản user | Tài khoản test user | "Tài khoản này không có quyền Admin."; không vào được dashboard | — | ❌ | ❌ | ❌ | Đã sửa #10 (`934b924`). Trước đây: Token user vẫn bị lưu vào localStorage dù bị từ chối |
| AUTH-POR-04 | E | P1 | — | Đăng nhập `/brand/login` bằng admin | `admin@fitme.ai` | "Tài khoản này không có quyền Brand. Vui lòng dùng tài khoản brand." | ❌ | — | ✅ | ❌ | rbac "brand login rejects admin credentials" |
| AUTH-POR-05 | E | P2 | — | Bấm đăng nhập portal khi để trống / email sai | — | Hiện lỗi dưới từng ô | — | ✅ | ❌ | ❌ | Đã sửa #27 (`d88f285`). Trước đây: Form portal không hiển thị lỗi trường, bấm không có phản hồi |
| AUTH-POR-06 | H | P2 | Đã có phiên admin hợp lệ | Mở `/admin/login` | — | Tự chuyển tới `/admin/dashboard` | — | — | ❌ | ❌ | |
| AUTH-POR-07 | E | P0 | Chưa đăng nhập | Mở `/admin/dashboard`, `/admin/users` | — | Chuyển tới `/admin/login` | — | — | ✅ | ✅ | rbac |
| AUTH-POR-08 | E | P0 | Đăng nhập user thường | Mở `/brand/dashboard` | — | Chuyển tới `/brand/login` | — | — | ✅ | ✅ | rbac |
| AUTH-POR-09 | E | P0 | Đăng nhập brand | Mở `/admin/dashboard` | — | Chuyển tới `/admin/login` | — | — | ✅ | ✅ | rbac |
| AUTH-POR-10 | W | P1 | Đăng nhập portal | Để yên > 1 giờ (access token trong cookie hết hạn), rồi chuyển trang | — | Vẫn ở trong portal (client đã refresh) | — | ❌ | ❌ | ❌ | Đã sửa #26 (`934b924`). Trước đây: Cookie không được đồng bộ sau refresh nên bị đẩy về trang đăng nhập |
| AUTH-POR-11 | W | P0 | — | Tự tạo cookie `fitme-access` ký bằng secret khác, `role=ADMIN` | — | Middleware từ chối, chuyển tới `/admin/login` | — | ❌ | — | ❌ | |
| AUTH-POR-12 | W | P1 | Brand đang mở portal | Admin khoá tài khoản brand | — | Mọi API trả lỗi quyền; trang báo lỗi rõ hoặc đăng xuất | ✅ | — | ❌ | ❌ | Cookie còn hiệu lực tối đa 24 giờ |
| AUTH-POR-13 | H | P1 | Đăng nhập portal | Bấm "Đăng xuất" trên header portal, rồi mở lại `/admin/dashboard` | — | Cookie bị xoá; bị chuyển tới trang đăng nhập | — | ❌ | ❌ | ❌ | |
| AUTH-POR-14 | E | P2 | Đăng nhập user thường | Mở `/brand/onboarding`, `/brand/pending` | — | Truy cập được (không cần quyền BRAND) | — | — | ✅ | ✅ | role-flows đăng ký brand |
