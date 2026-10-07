# Lỗi & lỗ hổng đã biết (phát hiện khi rà code để viết test case)

[← Mục lục](../TEST_CASES.md)

Cập nhật: 07/10/2026. Danh sách gốc (05/10/2026) gồm 50 lỗi và 6 rủi ro cấu hình, mỗi lỗi ứng với các case có ghi chú 🐞 trong file module.
**Cả 50 lỗi đã được sửa** qua 5 vòng. Mỗi vòng đi đúng chu trình: commit, CI xanh, deploy Render, kiểm tra lại trên prod.
Còn mở 2 rủi ro hạ tầng (INF-14, JOB-05/06) và 3 lỗ hổng chi phí do thiếu rate limit (SEC-ABU-01, SEC-ABU-02, TRY-GEN-21), xem cuối trang.
Sau đó FitMe gỡ thương mại in-app (V27, `7ae8d1d`) và chuyển sang mô hình Brand Plus (V28–V32). Một số lỗi bên dưới thuộc phần đã gỡ; ảnh hưởng ghi ở mục [Sau khi gỡ thương mại](#sau-khi-gỡ-thương-mại-v27-và-chuyển-sang-brand-plus).

**Mức độ:**

- **Cao:** ảnh hưởng tiền, bảo mật, dữ liệu hoặc nghĩa vụ pháp lý.
- **Trung bình:** sai chức năng, người dùng thấy rõ.
- **Thấp:** sai chữ hiển thị, trải nghiệm hoặc số liệu phụ.

**Cột "Kiểm chứng":**

- **BE / FE / E2E:** có test tự động chạy trong CI.
- **PROD:** đã gọi thật trên prod sau khi deploy và thấy đúng hành vi mới.

**Commit:**

| Commit | Vòng |
|---|---|
| `8153a83` | 1. Tiền và quyền |
| `934b924` | 2. Bảo mật tài khoản |
| `ec1f64a` | 3. Quyền riêng tư |
| `d88f285` | 4. Chức năng người dùng |
| `73e0fc9` | 5. Mức thấp và giao diện |
| `8255502` | 6. Đưa toàn bộ E2E vào CI, kèm 2 lỗi phát hiện thêm |
| `1352ea1` | 6. Test BE cho các case P0 (chỉ thêm test) |

## Mức Cao

| # | Case | Vấn đề (trước khi sửa) | Cách sửa | Commit | Kiểm chứng |
|---|---|---|---|---|---|
| 1 | SUB-14 (trước là PAY-08) | Webhook PayOS không kiểm tra mã kết quả; mọi payload ký hợp lệ đều coi là đã trả | Chỉ xác nhận khi `data.code = 00` và đủ số tiền (lúc sửa áp dụng cho đơn hàng và gói Pro; nay áp dụng cho gói Premium, top-up và Brand Plus) | `8153a83` | BE |
| 2 | BR-PRD-21 | Thống kê sản phẩm brand không kiểm tra quyền sở hữu | Sản phẩm của brand khác trả 404 | `8153a83` | BE, PROD |
| 3 | BR-APP-12, ADM-BRD-03 | Brand bị tạm ngưng vẫn xử lý đơn, giao hàng, đối soát | Chặn mọi thao tác portal khi brand tạm ngưng, giữ nguyên role để mở lại được. Từ V27 không còn đơn / giao hàng / đối soát; cùng cơ chế chặn mua Brand Plus, xem voucher, xem khách quan tâm | `8153a83` | BE |
| 4 | AUTH-LOG-10 | Đăng nhập không giới hạn số lần sai | Sai 5 lần thì khoá email 15 phút (429 `LOGIN_LOCKED`) | `934b924` | BE, PROD |
| 5 | AUTH-TOK-06 | Refresh token không xoay vòng, không thu hồi | Xoay vòng mỗi lần dùng; token cũ bị từ chối; FE đồng bộ token giữa các tab và cookie portal | `934b924` | BE, PROD |
| 6 | PRV-08 | Xoá "Toàn bộ tài khoản" chỉ xoá ảnh thư viện | Xoá hồ sơ, tủ đồ, ảnh, kết quả thử, lịch sử gợi ý / chat, đánh giá, địa chỉ, giỏ; ẩn danh và khoá tài khoản; giữ đơn hàng cho kế toán. Từ V27 địa chỉ, giỏ, đơn hàng không còn; V28 thêm xoá brand yêu thích, V32 thêm ẩn danh hoá khách quan tâm | `ec1f64a` | BE |
| 7 | PRV-02 | Không rút lại được đồng ý xử lý ảnh | Lần đồng ý mới nhất có hiệu lực; có `GET /privacy/consent` và nút rút đồng ý | `ec1f64a` | BE, PROD |
| 8 | BR-PRD-11 | Sửa sản phẩm tạo lại biến thể, tồn kho về 100 | Giữ ID và tồn kho biến thể; biến thể bị bỏ chỉ đánh dấu hết hàng. Từ V27 biến thể không còn tồn kho; việc giữ ID vẫn có test (`updateProduct_keepsVariantIds`) | `8153a83` | BE |
| 9 | TRY-INP-18, SEC-UPL-02 | Upload chỉ tin content-type client khai | Kiểm tra byte đầu file (JPEG / PNG / WEBP) | `934b924` | BE, PROD |
| 10 | AUTH-POR-03 | Đăng nhập portal sai role vẫn lưu token user | Không lưu phiên, thu hồi refresh token | `934b924` | E2E (chỉ kiểm thông báo từ chối; chưa có test kiểm token không được lưu) |
| 11 | BR-PRD-04 | Giá âm được chấp nhận | Giá 1.000 – 1.000.000.000 đ ở API và form | `8153a83` | BE, FE, PROD |
| 12 | AUTH-LOG-11 | `redirect` sau đăng nhập không được làm sạch | Chỉ chấp nhận đường dẫn cùng origin | `934b924` | FE |

## Mức Trung bình

| # | Case | Vấn đề (trước khi sửa) | Cách sửa | Commit | Kiểm chứng |
|---|---|---|---|---|---|
| 13 | AI-CHAT-11 | Không giới hạn độ dài tin nhắn chat | Tối đa 1000 ký tự ở FE và BE | `d88f285` | BE, PROD |
| 14 | TRY-SEL-16 | Thêm món không đủ điều kiện vào phiên thử | BE trả `TRY_ON_NOT_ELIGIBLE` | `d88f285` | BE |
| 15 | TRY-RES-05, TRY-RES-06 | Đổi màu / size gửi sai payload | Gửi `{value, productId}`, có chọn món, làm mới kết quả | `d88f285` | FE |
| 16 | TRY-INP-08 | Kiểm tra chất lượng ảnh là giả lập | Kiểm tra thật nhẹ: kích thước, độ sáng, độ tương phản, trả lý do tiếng Việt | `d88f285` | BE |
| 17 | TRY-GEN-04, TRY-GEN-05 | Dialog "mời đăng ký" / "Không đủ Fitken" không hiện ở trang nhập | Kiểm tra đăng nhập và số dư trước khi tạo phiên | `d88f285` | E2E |
| 18 | AI-REC-14 | Chat luôn gửi `NO_WARDROBE_DATA` | Gửi chế độ tủ đồ người dùng chọn | `d88f285` | FE |
| 19 | AI-TOP-05 | Gemini tắt thì bộ lọc chủ đề từ chối mọi câu | Không có phán quyết từ Gemini thì chỉ chặn danh sách lạc đề rõ ràng | `d88f285` | BE |
| 20 | AI-ACT-09 | `/ai/result/{id}` chuyển về chat | Trang hiện lại outfit đã lưu | `d88f285` | E2E |
| 21 | BR-SET-03 | Lưu cài đặt brand xoá link mạng xã hội | Chỉ cập nhật trường được gửi; form có đủ TikTok / Instagram / Facebook | `d88f285` | BE, PROD |
| 22 | BR-PRD-05 | URL mua hàng không được kiểm tra | Từ chối URL sai / nội bộ (`INVALID_PURCHASE_URL`). Từ V27 link mua là bắt buộc và admin không duyệt được sản phẩm thiếu link | `d88f285` | BE, PROD |
| 23 | BR-PRD-22 | Biểu đồ hoàn cảnh / size / màu luôn trống | BE trả `topOccasions`, `topSizes`, `topColors` | `d88f285` | BE, PROD |
| 24 | SUB-04 | Trang billing return luôn báo thành công | Hỏi trạng thái mỗi 3 giây tới khi PAID / huỷ / hết lượt | `d88f285` | FE |
| 25 | SUB-11 | Đơn gói chờ thanh toán không bao giờ hết hạn | Tác vụ nền chuyển đơn quá hạn sang EXPIRED | `d88f285` | BE |
| 26 | AUTH-POR-10 | Cookie portal không đồng bộ sau refresh | Đồng bộ cookie khi token xoay vòng; middleware chấp nhận cookie đã ký nhưng hết hạn | `934b924` | Chưa có test tự động |
| 27 | AUTH-POR-05 | Form đăng nhập portal không báo lỗi trường | Hiện lỗi từng trường | `d88f285` | FE |
| 28 | AUTH-PWD-05 | Quên mật khẩu không báo lỗi | Hiện lỗi từ backend | `d88f285` | FE |
| 29 | PRV-10 | Xử lý yêu cầu xoá với ID không tồn tại trả 500 | Trả 404 | `ec1f64a` | BE, PROD |
| 30 | PRV-11 | Admin đọc `granted`, BE trả `accepted` | FE đọc `accepted` | `ec1f64a` | PROD |
| 31 | ADM-PRD-04 | Lý do từ chối sản phẩm không được lưu | Lưu (tối đa 100 ký tự), brand thấy lý do | `d88f285` | BE, PROD |
| 32 | INF-07 | Lỗi cấu hình R2 bị map thành 401 | Chỉ lỗi xác thực thật mới trả 401 | `d88f285` | BE, PROD |
| 33 | PRO-15 | BE không kiểm tra số đo | Giới hạn hợp lý cho từng số đo | `d88f285` | BE, PROD |
| 34 | ADR-08 | BE không kiểm tra số điện thoại | `INVALID_PHONE`; tự bỏ dấu cách / chấm | `d88f285` | BE, PROD. Case và sổ địa chỉ đã gỡ ở V27 |
| 35 | WAR-08 | Tủ đồ không có nút sửa / xoá | Có sửa và xoá | `d88f285` | FE |
| 36 | GAL-08 | Thư viện chỉ tải 20 ảnh | Tải thêm theo trang | `d88f285` | FE |
| 37 | AUTH-VER-12 | Gửi lại mã lộ email đã đăng ký | Phản hồi giống nhau cho mọi email | `934b924` | BE, PROD |
| 38 | AUTH-REG-24 | Tên quá dài trả 409 | 400 lỗi kiểm tra | `934b924` | BE, PROD |
| 39 | AUTH-REG-25 | Mật khẩu đăng ký không giới hạn trên | Tối đa 100 ký tự | `934b924` | BE, PROD |

## Mức Thấp

| # | Case | Vấn đề (trước khi sửa) | Cách sửa | Commit | Kiểm chứng |
|---|---|---|---|---|---|
| 40 | AI-ACT-11 | "Sản phẩm tương tự" là 6 sản phẩm đầu | Xếp theo cùng danh mục / vai trò, rồi brand và tầm giá; bỏ các món đã có trong outfit | `73e0fc9` | BE, PROD |
| 41 | QUIZ-06 | Ngân sách quiz không lọc theo giá | Lọc theo khoảng giá khi còn ít nhất 8 sản phẩm phù hợp | `73e0fc9` | BE |
| 42 | PRO-11 | Lỗi số đo bị che trong phần thu gọn | Tự mở phần số đo và focus trường lỗi | `73e0fc9` | FE |
| 43 | TRY-GEN-17 | Không hiện nhãn tiến trình | FE map `processingStepLabel` | `73e0fc9` | FE |
| 44 | TRY-RES-09, GAL-10 | UI ghi "Nhận 2 Fitken" | Đọc số Fitken thưởng từ backend | `73e0fc9` | PROD |
| 45 | RWD-SHR-10 | Toast "Admin sẽ duyệt…" sai | Toast theo kết quả thật | `73e0fc9` | FE |
| 46 | TRY-2D-02 | Chỉ nhận JPG / PNG | Nhận cả WEBP, kiểm tra loại / dung lượng ở FE | `73e0fc9` | FE |
| 47 | TRY-2D-03 | Enum chất lượng ảnh FE khác BE | FE dùng đúng `GOOD / LOW_QUALITY / INVALID / PENDING` | `73e0fc9` | FE |
| 48 | RED-07 | Lỗi buy-click bị nuốt | Hiện lỗi và toast | `73e0fc9` | FE |
| 49 | RED-08 | `sourcePage` luôn là `PRODUCT_DETAIL` | Gửi đúng trang nguồn, gợi ý, phiên thử, size, màu | `73e0fc9` | FE, PROD |
| 50 | ADM-BRD-04 | Trang duyệt brand hiện enum thô | Nhãn tiếng Việt | `73e0fc9` | E2E |

## Lỗi phát hiện thêm trong đợt sửa

| Case | Vấn đề | Cách sửa | Commit | Kiểm chứng |
|---|---|---|---|---|
| TRY-INP (mới) | Ở trang nhập thử mặc, đổi chế độ / chọn avatar / upload ảnh làm mất số đo vừa gõ | Giữ giá trị người dùng đã sửa khi form nhận giá trị mới | `8255502` | E2E |
| A11Y (mới) | Nhãn ô nhập ở trang đặt lại mật khẩu, quên mật khẩu, xác thực email, captcha đăng ký không gắn với ô | Gắn `htmlFor` / `id` | `8255502` | E2E |

## Rủi ro cấu hình

| Case | Rủi ro | Trạng thái |
|---|---|---|
| RED-06 | `/redirect/loading?url=` chuyển tới mọi URL | ✅ Đã sửa (`934b924`): URL lấy từ sự kiện, bỏ qua `?url=` · E2E, PROD |
| SEC-CFG-03 | `CORS_ORIGINS` không trim khoảng trắng | ✅ Đã sửa (`934b924`) · BE |
| SEC-CFG-04 | Thiếu header bảo mật | ✅ Đã sửa (`934b924`): HSTS, `X-Content-Type-Options`, `frame-ancestors`, `Referrer-Policy` · PROD |
| UI-05, UI-06 | Chưa có trang 404 / trang lỗi tiếng Việt | ✅ Đã sửa (`73e0fc9`) · PROD |
| INF-14 | Captcha, bộ đếm sai mã, khoá đăng nhập, giới hạn chat lưu trong bộ nhớ, mất khi restart và không chia sẻ giữa nhiều instance | ⏳ Còn mở. Chấp nhận được khi chạy 1 instance Render; cần Redis / DB nếu scale |
| JOB-05, JOB-06 | Render Free ngủ có thể làm lỡ tác vụ hẹn giờ | ⏳ Còn mở. Cần gói trả phí hoặc cron ngoài gọi đánh thức |
| SEC-ABU-01 | Chat AI chỉ giới hạn 20 tin / giờ / session; mở session mới là vượt được, chi phí Gemini không có trần | ⏳ Còn mở. Test BE `P0StylistChatIntegrationTest` đang `@Disabled`, chờ quyết định mức giới hạn |
| SEC-ABU-02 | Đăng ký không giới hạn theo IP; captcha phép cộng dễ giải tự động | ⏳ Còn mở. Test BE `P0SecurityIntegrationTest` đang `@Disabled` |
| TRY-GEN-21 | Tạo thử mặc không giới hạn tần suất; mỗi tài khoản mới dùng được 5 Fitken thử cho FASHN | ⏳ Còn mở. Test BE `P0TryOnIntegrationTest` đang `@Disabled` |

## Test BE cho P0 (`1352ea1`)

7 class `P0*IntegrationTest` phủ 22/33 case P0 trước đây chưa có test: webhook PayOS ký sai và báo thất bại (chạy với SDK PayOS thật, không mock), bấm đặt 2 lần, 5 người tranh món cuối, webhook gói gửi 2 lần, dùng giỏ / địa chỉ / sản phẩm / ảnh của người khác, JWT sửa role và `alg: none`, SQL / wildcard trong tìm kiếm, CSV injection, CORS origin lạ, SVG có script và file giả JPEG ở cả 6 chỗ upload.
Tất cả pass trên code lúc đó, không phát hiện lỗi sản phẩm mới. Ở V27 các test về đơn hàng, giỏ, địa chỉ, tranh món cuối bị xoá cùng tính năng; `P0BillingWebhookIntegrationTest` giữ phần webhook cho đơn gói (ký sai, báo thất bại, gửi 2 lần). Hai điểm chưa khớp hoàn toàn với kết quả mong đợi:

- **BR-PRD-20:** thao tác lên sản phẩm của brand khác trả 400 thay vì 403. Không lộ hay sửa được dữ liệu; đổi mã lỗi là quyết định sản phẩm.
- **CAT-DIS-06:** `GET /products` không phân trang, trả mọi sản phẩm khớp trong một lần. Chưa là vấn đề với danh mục hiện tại, cần phân trang khi danh mục lớn.

## Sau khi gỡ thương mại (V27) và chuyển sang Brand Plus

FitMe không còn bán hàng trên web: khách mua ở cửa hàng gốc của brand, FitMe thu phí brand qua gói Brand Plus (V29) và bán gói Premium cho người dùng (V28).

**Case đã xoá (không đánh lại số):**

| Module | Case | Lý do |
|---|---|---|
| 05 | CAT-PDP-02..05, CAT-PDP-09..11 | Không còn chọn biến thể, tồn kho, giỏ, "Mua ngay" |
| 06 | Toàn bộ 77 case CART / CHK / PAY / ORD / ADR (file `06-cart-checkout-order.md`) | Thay bằng [06-brand-plus-voucher-lead.md](06-brand-plus-voucher-lead.md). PAY-07 / PAY-08 chuyển thành SUB-15 / SUB-14 |
| 07 | VCH-01..05 | Voucher freeship của người dùng đã gỡ |
| 09 | MAIL-11, MAIL-12, MAIL-14 | Email đơn hàng đã gỡ |
| 10 | BR-ORD, BR-STL, BR-ANA-08 | Brand không còn xử lý đơn, đối soát |
| 11 | ADM-ORD-01..07, ADM-GRW-05 | Trang đơn hàng / đối soát của admin đã gỡ |
| 12 | SEC-CFG-12 | Webhook vận chuyển đã gỡ |
| 13 | NAV-14 | Badge giỏ hàng đã gỡ |

**Lỗi đã sửa ở trên không còn áp dụng:** #34 (sổ địa chỉ đã gỡ); phần đơn hàng / giao hàng / đối soát của #1, #3, #6; phần tồn kho của #8.

**Điểm cần theo dõi** (chưa phải lỗi, ghi lại khi viết case mới):

| Case | Điểm | Trạng thái |
|---|---|---|
| SEC-CFG-11 | PayOS chế độ mock tự đánh dấu đơn gói đã trả khi mở trang return. Ngày 07/10 checkout Brand Plus trên prod trả `mock=false`, tức prod đang dùng PayOS thật | ✅ Giữ `PAYOS_MOCK=false` trên prod |
| BP-BUY-12 | Huỷ đơn Brand Plus chỉ đổi trạng thái trong FitMe, link PayOS vẫn mở tới khi hết hạn. Nếu brand vẫn trả tiền, đơn được ghi nhận và gói được kích hoạt | Chủ ý: tiền đã nhận thì kích hoạt |
| BP-BUY-16 | Admin đặt giảm 100% thì brand không thanh toán được, phải liên hệ FitMe để kích hoạt | Chủ ý thiết kế; chưa có test |
| ADM-SET-07 | Đổi "Điểm ưu tiên gợi ý (brand Plus)" chưa có test từ cài đặt tới chấm điểm | ⏳ Thiếu test |
| PRV-18 | Khách chưa đăng nhập đồng ý chia sẻ theo session rồi bấm mua: chưa có test khẳng định không tạo lead | ⏳ Thiếu test |
| JOB-05, JOB-06 | Thêm 2 tác vụ hẹn giờ (Brand Plus 00:10, voucher brand 00:15) chịu cùng rủi ro Render ngủ | Ảnh hưởng thấp: trạng thái hiệu lực được tính theo `endsAt` / hạn dùng, không phụ thuộc job |
