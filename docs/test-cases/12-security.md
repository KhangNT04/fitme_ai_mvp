# 12 · Bảo mật (SEC)

[← Mục lục](../TEST_CASES.md)

Các case bảo mật gắn với từng tính năng đã nằm trong module tương ứng (ví dụ AUTH-LOG-10 brute-force, PAY-07 webhook giả). File này gom các case xuyên suốt hệ thống.

## Hiện trạng (đọc từ code)

| Hạng mục | Hiện trạng |
|---|---|
| Phân quyền | `/api/v1/admin/**` cần ADMIN, `/api/v1/brand/**` cần BRAND_OWNER; vai trò đọc **từ DB** mỗi request (sửa claim `role` trong token không có tác dụng ở backend) |
| Chưa đăng nhập | Không có entry point riêng → API cần đăng nhập trả **403 rỗng** thay vì 401; FE chỉ tự refresh khi gặp 401 |
| JWT | HMAC (HS512 với secret mặc định 64 byte); secret mặc định dev nằm trong code — prod phải ghi đè |
| Rate limit | **Không có** rate limit chung. Chỉ có: chat 20 / giờ, cooldown email 60 giây, captcha, honeypot |
| CORS | Từ `CORS_ORIGINS` (tách dấu phẩy, không trim); cho phép credentials |
| Header bảo mật | Chỉ mặc định của Spring Security; Next.js không thêm header (không có CSP) |
| Upload | Chỉ kiểm tra content-type do client gửi; không kiểm tra magic bytes; không cho SVG; ≤ 5 MB |
| Lỗi | Dạng `{success:false, error, errorCode}`; lỗi 500 không lộ chi tiết |
| `/api/v1/test/**` | permitAll; chỉ hoạt động khi `fitme.test.expose-reset-tokens=true` (prod tắt) |

---

## 12.1 Phân quyền & IDOR (SEC-AUZ)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-AUZ-01 | W | P0 | 4 vai trò: khách, user, brand, admin | Gọi một API đại diện của từng nhóm (public, user, brand, admin) bằng từng vai trò | Ma trận 4 × 4 | Chỉ vai trò đúng mới truy cập được; còn lại 401/403 | ✅ | — | ✅ | ✅ | `SecurityConfigTest`; rbac.spec; prod 4 kiểm tra RBAC |
| SEC-AUZ-02 | W | P0 | User A, B | Lần lượt thử truy cập tài nguyên của B bằng ID: địa chỉ, đơn hàng, dòng giỏ, ảnh upload, kết quả thử mặc, ảnh thư viện, hội thoại chat, món tủ đồ, sự kiện redirect | — | Tất cả 403/404 | ✅ | — | — | ❌ | Đã test: địa chỉ, đơn, seller order, tủ đồ, redirect. Chưa test: giỏ, ảnh upload, thử mặc, thư viện, chat |
| SEC-AUZ-03 | W | P0 | Brand A, B | Thao tác sản phẩm / đơn / phân tích của B | — | 403 | ✅ | — | — | ❌ | Xem BR-PRD-20, BR-PRD-21, BR-ORD-10 |
| SEC-AUZ-04 | W | P1 | — | Gọi API cần đăng nhập không có token | `GET /me/fitken` | Trả 401 rõ ràng (để FE xử lý thống nhất) | ❌ | — | — | ✅ | Hiện trả 403 rỗng |
| SEC-AUZ-05 | W | P0 | User thường | Sửa claim `role` thành ADMIN trong token (giữ chữ ký cũ) | — | Bị từ chối (chữ ký sai) | ✅ | — | — | ❌ | BE `P0SecurityIntegrationTest#tamperedRoleClaimWithOriginalSignature_isRejected` |
| SEC-AUZ-06 | W | P0 | — | Tạo token với `alg: none` | — | Bị từ chối | ✅ | — | — | ❌ | BE `P0SecurityIntegrationTest#unsignedAlgNoneToken_isRejected` |
| SEC-AUZ-07 | W | P0 | — | Ký token bằng secret mặc định dev (`fitme-dev-secret-change-in-production…`) gửi lên prod | — | Bị từ chối (prod dùng secret khác) | ❌ | — | — | ❌ | Kiểm tra cấu hình prod |
| SEC-AUZ-08 | W | P1 | — | Gọi `/api/v1/test/password-reset-token?email=` trên prod | — | 404 (endpoint không tồn tại ở prod) | ❌ | — | — | ❌ | |
| SEC-AUZ-09 | W | P1 | User thường | Gọi `PUT /me/entitlement/users/{id}` để tự cấp Pro | — | 403 | ❌ | — | — | ❌ | Endpoint admin nằm dưới `/me/**` |
| SEC-AUZ-10 | W | P1 | User thường | Gọi API admin rules cũ `/admin/rules/*` | — | 403 | ✅ | — | — | ❌ | |

## 12.2 Tấn công đầu vào (SEC-INJ)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-INJ-01 | W | P0 | — | Chèn SQL vào tìm kiếm, bộ lọc, admin tìm tài khoản | `' OR '1'='1`, `'; DROP TABLE users;--` | Không lỗi 500, không lộ dữ liệu | ✅ | — | — | ❌ | JPA dùng tham số hoá nhưng chưa có test; BE `P0SecurityIntegrationTest#adminUserSearch_isParameterizedEscapedAndPageBounded` |
| SEC-INJ-02 | W | P0 | — | Chèn XSS vào: họ tên, tên brand, mô tả brand, tên sản phẩm, mô tả sản phẩm, đánh giá, tin nhắn chat, tên món tủ đồ, ghi chú đơn, lý do huỷ | `<img src=x onerror=alert(document.cookie)>` | Hiển thị như văn bản ở mọi nơi (cửa hàng, portal brand, portal admin, email) | ❌ | ❌ | ❌ | ❌ | React tự escape; cần kiểm tra chỗ dùng `dangerouslySetInnerHTML` và email HTML |
| SEC-INJ-03 | W | P1 | — | Chèn HTML vào tên hiển thị rồi kích hoạt email | — | Email HTML không chạy / không hiển thị HTML lạ | ❌ | — | — | ❌ | |
| SEC-INJ-04 | W | P1 | — | Link mua `javascript:alert(1)` / `data:text/html…` | — | Không bao giờ hiện thành link bấm được | ✅ | — | — | ❌ | `UrlValidatorTest`, `canShowBuyButton_whenDataUrl…` |
| SEC-INJ-05 | W | P1 | — | Chèn công thức vào dữ liệu xuất CSV | `=1+1`, `@SUM(A1)` | Ô được thêm `'` | ❌ | — | — | ❌ | Xem ADM-GRW-04 |
| SEC-INJ-06 | W | P1 | — | Tham số kiểu sai | `GET /products/not-a-uuid` | 404 "Không tìm thấy tài nguyên", không 500 | ❌ | — | — | ❌ | |
| SEC-INJ-07 | W | P1 | — | JSON sai cú pháp / enum lạ | — | 400 "Dữ liệu gửi lên không hợp lệ" | ✅ | — | — | ❌ | `malformedJsonBody_returnsBadRequest` |
| SEC-INJ-08 | W | P2 | — | Body JSON 50 MB | — | Bị từ chối sớm, server không treo | ❌ | — | — | ❌ | |
| SEC-INJ-09 | W | P1 | — | Prompt injection vào chat AI | Xem AI-TOP-06 | Không lộ prompt, không bịa sản phẩm | ❌ | — | — | ❌ | |

## 12.3 Upload file (SEC-UPL)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-UPL-01 | W | P0 | — | Upload SVG có script ở mọi chỗ upload (ảnh thử, tủ đồ, đánh giá, sản phẩm, logo, avatar) | `evil.svg` | Bị từ chối | ✅ | ✅ | — | ❌ | `upload-file.test rejects unsupported types`; BE `P0SecurityIntegrationTest#svgWithScript_isRejectedEverywhere` |
| SEC-UPL-02 | W | P0 | — | Upload file HTML / EXE khai báo `Content-Type: image/jpeg` | — | Bị từ chối (kiểm tra nội dung thật) | ✅ | — | — | ✅ | Đã sửa #9 (`934b924`). Trước đây: Chỉ kiểm tra content-type do client gửi; BE `P0SecurityIntegrationTest#nonImageBytesDeclaredAsJpeg_areRejectedEverywhere` |
| SEC-UPL-03 | W | P1 | — | Tên file `../../etc/passwd.jpg` | — | Tên được làm sạch, không ghi ra ngoài thư mục upload | ❌ | — | — | ❌ | Có làm sạch `[^a-zA-Z0-9._-]` |
| SEC-UPL-04 | W | P1 | — | File 5 MB + 1 byte | — | Bị từ chối (413 / thông báo "Ảnh tối đa 5MB") | ❌ | ✅ | — | ❌ | |
| SEC-UPL-05 | W | P1 | — | Ảnh JPG chứa metadata GPS | — | Ghi nhận: metadata có bị xoá trước khi lưu công khai không | ❌ | — | — | ❌ | Quyền riêng tư |
| SEC-UPL-06 | W | P1 | — | Ảnh cá nhân upload có URL công khai đoán được | — | Không truy cập được ảnh của người khác bằng cách đoán URL | ❌ | — | — | ❌ | |

## 12.4 Lạm dụng & chi phí (SEC-ABU)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-ABU-01 | W | P0 | — | Spam chat AI bằng nhiều session mới | Script | Có giới hạn theo IP / toàn hệ thống để không đốt chi phí Gemini | ❌ | — | — | ❌ | Chỉ có 20 tin / giờ / session; Lỗ hổng đã biết: test BE `P0StylistChatIntegrationTest#chatSpamAcrossFreshSessionsFromOneClient_isThrottled` đang @Disabled |
| SEC-ABU-02 | W | P0 | — | Tạo hàng loạt tài khoản để lấy 5 Fitken thử mỗi tài khoản rồi thử mặc | Script | Captcha + giới hạn chặn được; chi phí FASHN có trần | ❌ | — | — | ❌ | Captcha phép cộng dễ giải tự động; Lỗ hổng đã biết: test BE `P0SecurityIntegrationTest#massRegistrationFromOneClient_isThrottled` đang @Disabled |
| SEC-ABU-03 | W | P1 | — | Spam endpoint đăng ký / quên mật khẩu với nhiều email | Script | Giới hạn theo IP để không cạn quota Gmail | ❌ | — | — | ❌ | Chỉ có cooldown theo email |
| SEC-ABU-04 | W | P1 | — | Spam `/analytics/visit` | Script | Giới hạn tần suất | ❌ | — | — | ❌ | Xem ADM-TRF-14 |
| SEC-ABU-05 | W | P1 | — | Đánh giá ảo để lấy Fitken (không cần mua hàng) | — | Ghi nhận rủi ro; tối đa +2 / ngày / tài khoản | ✅ | — | — | ❌ | Xem REV-14 |
| SEC-ABU-06 | W | P1 | — | Gửi link chia sẻ giả để lấy +3 Fitken | — | Ghi nhận rủi ro; admin cần rà và từ chối | ✅ | — | — | ❌ | Xem RWD-SHR-11 |

## 12.5 Cấu hình, bí mật & header (SEC-CFG)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-CFG-01 | W | P0 | — | Tìm trong bundle JS prod các chuỗi: `JWT_SECRET`, `GMAIL_APP_PASSWORD`, `MAIL_RELAY_SECRET`, `GEMINI`, `FASHN`, `re_`, `sk-` | — | Không có bí mật nào trong bundle | ❌ | — | — | ❌ | Chỉ biến `NEXT_PUBLIC_*` được phép |
| SEC-CFG-02 | W | P0 | — | Gọi API từ origin lạ (`Origin: https://evil.com`) | — | Không có header `Access-Control-Allow-Origin` cho origin lạ | ✅ | — | — | ❌ | BE `P0SecurityIntegrationTest#cors_unknownOriginGetsNoAllowOriginHeader` |
| SEC-CFG-03 | W | P1 | — | `CORS_ORIGINS` có khoảng trắng sau dấu phẩy | `https://a.com, https://b.com` | Cả 2 origin đều hoạt động | ❌ | — | — | ❌ | Code không trim → origin thứ 2 hỏng |
| SEC-CFG-04 | W | P1 | — | Kiểm tra header phản hồi của frontend và backend | — | Có HSTS, `X-Content-Type-Options`, `X-Frame-Options` / CSP `frame-ancestors`, `Referrer-Policy` | ❌ | — | — | ❌ | Next.js chưa cấu hình header |
| SEC-CFG-05 | W | P1 | — | Gây lỗi 500 | — | Thông báo "Đã xảy ra lỗi hệ thống", không lộ stack trace / tên bảng | ❌ | — | — | ❌ | |
| SEC-CFG-06 | W | P1 | — | Mở `/swagger-ui.html`, `/api-docs` trên prod | — | 404 (tắt ở prod) | ❌ | — | — | ❌ | |
| SEC-CFG-07 | W | P1 | — | Mở `/actuator/health` trên prod | — | Chỉ trả trạng thái, không lộ chi tiết cấu hình | ❌ | — | — | ✅ | |
| SEC-CFG-08 | W | P1 | — | Mở `/actuator/env`, `/actuator/beans` | — | 404 | ❌ | — | — | ❌ | |
| SEC-CFG-09 | W | P1 | — | Cookie portal | — | `HttpOnly`, `Secure`, `SameSite=Lax` | — | ❌ | — | ❌ | |
| SEC-CFG-10 | W | P1 | — | Token lưu localStorage | — | Ghi nhận rủi ro: nếu có XSS thì token bị đánh cắp | — | — | — | — | |
| SEC-CFG-11 | W | P1 | — | Prod chạy PayOS ở chế độ live và có `checksum-key` | — | Đúng cấu hình (mock không kiểm tra chữ ký webhook) | ❌ | — | — | ❌ | Xem PAY-07 |
| SEC-CFG-12 | W | P1 | — | Prod không dùng `dev-logistics-token` | — | Token webhook vận chuyển là giá trị bí mật riêng | ❌ | — | — | ❌ | |
| SEC-CFG-13 | W | P1 | — | `robots.txt` | — | Chặn `/admin`, `/brand`, `/api`, `/auth`, `/profile`, `/checkout`, `/cart` | — | — | — | ❌ | |
| SEC-CFG-14 | W | P2 | — | `/api/auth/session` không gửi token / token sai | — | 400 "Missing token" / 401 "Invalid token" | — | ❌ | — | ❌ | |
