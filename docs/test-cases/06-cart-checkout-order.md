# 06 · Giỏ hàng, thanh toán, đơn hàng & địa chỉ (CART / CHK / PAY / ORD / ADR)

[← Mục lục](../TEST_CASES.md)

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Giỏ hàng | Bắt buộc đăng nhập (không có giỏ khách). Số lượng > 0; cùng biến thể thì cộng dồn; vượt tồn kho → `OUT_OF_STOCK` "Số lượng vượt quá tồn kho". FE giới hạn 1–99 hoặc theo tồn kho. Nhóm theo brand |
| Món không khả dụng | Sản phẩm không ACTIVE hoặc tồn < số lượng: giữ trong giỏ, không tính tiền, có thông báo riêng |
| Phí ship | **30.000đ mỗi shop**; voucher freeship chỉ giảm phí ship, tối đa `maxDiscountVnd`; tổng = tạm tính + ship − giảm |
| Voucher | Chỉ loại FREESHIP; 1 voucher / đơn; phải thuộc người dùng, AVAILABLE, chưa hết hạn. Hiện gói Pro **không** tặng voucher (V23) |
| Thanh toán | COD → đơn `CONFIRMED` ngay, voucher USED, gửi email. PAYOS → `PENDING_PAYMENT`, voucher RESERVED; **quá 30 phút** tự huỷ, hoàn kho, trả voucher |
| Tồn kho | Trừ ngay khi đặt (cập nhật có điều kiện); hoàn khi huỷ |
| Trạng thái đơn | `PENDING_PAYMENT` → `CONFIRMED` → `PROCESSING` → `COMPLETED`, hoặc `CANCELLED` |
| Trạng thái đơn seller | `PENDING` → `CONFIRMED` → `PACKED` → `SHIPPING` → `DELIVERED`, hoặc `CANCELLED` (từ PENDING / CONFIRMED / PACKED). `RETURNED` có nhưng chưa bao giờ được dùng |
| Huỷ đơn (khách) | Được huỷ trừ khi đơn đã CANCELLED / COMPLETED hoặc có phần đang giao / đã giao → "Đơn hàng không thể hủy" |
| Webhook PayOS | Live: SDK kiểm tra chữ ký `checksum-key`; mock: **không kiểm tra**. Không xem mã thành công trong payload. Idempotent (chỉ áp dụng khi UNPAID) |
| Địa chỉ | FE: tên, SĐT (regex `^(0\|\+?84)\d{9,10}$`), tỉnh, quận, phường, số nhà bắt buộc. BE: chỉ bắt buộc tên + SĐT không rỗng, **không kiểm tra định dạng SĐT**. Không giới hạn số địa chỉ |
| Hoa hồng & đối soát | Hoa hồng 10%; đối soát sau 7 ngày kể từ khi giao |

---

## 6.1 Giỏ hàng (CART)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CART-01 | H | P0 | Đăng nhập | Thêm 1 sản phẩm (màu, size) vào giỏ | — | Giỏ có 1 dòng; badge header = 1; tạm tính đúng | ✅ | — | ✅ | ✅ | `CartIntegrationTest`; prod UI + API |
| CART-02 | H | P1 | Đã có biến thể X × 1 | Thêm X × 2 | — | 1 dòng duy nhất, số lượng 3 | ✅ | — | ❌ | ❌ | `addToCart_accumulatesQuantity…` |
| CART-03 | H | P1 | — | Thêm 2 sản phẩm của 2 brand | — | 2 nhóm theo brand; "Tính ở bước thanh toán (2 shop)" | ✅ | — | ❌ | ✅ | |
| CART-04 | H | P1 | — | Tăng / giảm số lượng bằng nút +/− | — | Tổng tiền cập nhật; không xuống dưới 1 | ❌ | ✅ | ❌ | ✅ | `commerce-utils.test "clamps into [1, stock]"` |
| CART-05 | E | P1 | Tồn kho 5 | Tăng lên 6 | — | Nút + bị khoá ở 5; API: "Số lượng vượt quá tồn kho" | ✅ | ✅ | ❌ | ❌ | |
| CART-06 | E | P2 | Tồn kho 500 | Tăng lên 100 | — | Giới hạn 99 ở UI | — | ✅ | ❌ | ❌ | "caps at 99" |
| CART-07 | E | P2 | — | Gọi PATCH số lượng 0 / âm | — | Dòng bị xoá | ❌ | — | — | ❌ | |
| CART-08 | E | P2 | — | Gọi thêm vào giỏ với số lượng 0 | — | "Số lượng phải lớn hơn 0" | ❌ | — | — | ❌ | |
| CART-09 | H | P1 | — | Xoá 1 dòng | — | Dòng biến mất, tổng cập nhật | ❌ | — | ❌ | ✅ | |
| CART-10 | H | P2 | — | Xoá toàn bộ giỏ | — | Giỏ trống, có nút quay lại mua sắm | ❌ | — | ❌ | ✅ | |
| CART-11 | E | P1 | Khách | Mở `/cart`, `/checkout` | — | "Đăng nhập để xem giỏ hàng của bạn" / chuyển tới đăng nhập | — | — | ✅ | ❌ | commerce.spec |
| CART-12 | E | P1 | Sản phẩm trong giỏ bị brand ẩn | Mở giỏ | — | Dòng hiện "Sản phẩm hiện không còn bán."; không tính vào tổng | ❌ | ✅ | ❌ | ❌ | `commerce-utils.test splits available…` |
| CART-13 | E | P1 | Giỏ có 3, tồn kho giảm còn 1 | Mở giỏ | — | "Chỉ còn 1 sản phẩm — hãy giảm số lượng."; "{n} sản phẩm không đủ hàng sẽ không được tính vào đơn." | ❌ | ✅ | ❌ | ❌ | |
| CART-14 | E | P2 | Có món tồn kho 0 | Bấm "Xóa sản phẩm hết hàng" | — | Chỉ xoá món tồn kho 0, giữ món thiếu một phần | ❌ | ❌ | ❌ | ❌ | |
| CART-15 | W | P0 | — | Thêm biến thể không thuộc sản phẩm / sản phẩm DRAFT (qua API) | — | "Sản phẩm không thể mua" | ✅ | — | — | ❌ | BE `P0CommerceIntegrationTest#addToCart_rejectsForeignVariantAndDraftProduct` |
| CART-16 | W | P1 | User A | Gọi PATCH / DELETE dòng giỏ của user B | — | Bị chặn (404/403) | ❌ | — | — | ❌ | IDOR |
| CART-17 | W | P2 | Mở 2 tab | Sửa số lượng ở cả 2 tab | — | Dữ liệu cuối cùng nhất quán, không âm | ❌ | — | ❌ | ❌ | |
| CART-18 | W | P2 | — | Bấm "Thêm vào giỏ" 5 lần nhanh | — | Số lượng tăng đúng 5 hoặc nút khoá khi đang gửi; không lỗi trùng khoá | ❌ | — | ❌ | ❌ | |

## 6.2 Trang thanh toán (CHK)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CHK-01 | H | P0 | Giỏ có 1 món 329.000đ, có địa chỉ mặc định | Mở `/checkout` | — | Địa chỉ mặc định; tạm tính 329.000đ; ship 30.000đ; tổng 359.000đ | ✅ | ✅ | ✅ | ✅ | `preview_returnsCamelCaseCartItems_groupedBySeller`; prod 05/10 |
| CHK-02 | H | P1 | Giỏ 2 shop | Mở `/checkout` | — | Ship 60.000đ (30.000đ × 2), tách theo shop | ✅ | ✅ | ❌ | ❌ | |
| CHK-03 | E | P1 | Chưa có địa chỉ | Mở `/checkout` | — | Bắt thêm địa chỉ trước khi đặt | — | ✅ | ❌ | ❌ | |
| CHK-04 | E | P2 | Không có địa chỉ mặc định | Mở `/checkout` | — | Dùng địa chỉ đầu tiên | — | ✅ | ❌ | ❌ | "prefers the default address" |
| CHK-05 | H | P1 | Có voucher freeship (tối đa 30.000đ) | Chọn voucher | — | Giảm 30.000đ; tổng 329.000đ | ✅ | ✅ | ❌ | ❌ | `checkoutCod_appliesFreeshipVoucher_andConsumesIt` |
| CHK-06 | E | P1 | Voucher tối đa 50.000đ, ship 30.000đ | Chọn voucher | — | Chỉ giảm 30.000đ (không vượt phí ship); tổng không âm | ✅ | ✅ | ❌ | ❌ | "applies freeship discount capped by shipping fee" |
| CHK-07 | E | P2 | Không có voucher | Xem mục voucher | — | "Bạn chưa có voucher freeship." | — | ❌ | ❌ | ✅ | |
| CHK-08 | W | P1 | — | Gọi preview với voucher của người khác / đã dùng / hết hạn | — | "Voucher không khả dụng" | ❌ | — | — | ❌ | |
| CHK-09 | E | P1 | Giỏ trống | Gọi preview / đặt hàng | — | "Giỏ hàng trống" | ❌ | — | — | ❌ | |
| CHK-10 | E | P1 | Giỏ có món vừa hết hàng | Đặt hàng | — | "Có sản phẩm hết hàng hoặc không còn bán" | ❌ | — | ❌ | ❌ | |
| CHK-11 | E | P2 | — | Nhập ghi chú 300 ký tự (UI) / 1001 ký tự (API) | — | UI giới hạn 300; API báo lỗi > 1000 | ❌ | ❌ | ❌ | ❌ | |
| CHK-12 | W | P1 | — | Gọi đặt hàng với `paymentMethod: "BITCOIN"` | — | "Phương thức thanh toán không hợp lệ" | ❌ | — | — | ❌ | |
| CHK-13 | W | P0 | — | Gọi đặt hàng với `addressId` của người khác | — | 404 "Địa chỉ không tồn tại" | ✅ | — | — | ❌ | BE `P0CommerceIntegrationTest#placeOrder_withSomeoneElsesAddress_isNotFound` |
| CHK-14 | W | P0 | Giỏ 3 món, chọn 2 | Gọi đặt hàng với `cartItemIds` gồm dòng giỏ của người khác | — | Bị từ chối; không mua hộ được món của người khác | ✅ | — | — | ❌ | BE `P0CommerceIntegrationTest#placeOrder_cannotBuySomeoneElsesCartLines` |
| CHK-15 | H | P2 | — | Chọn PayOS | — | Nút đổi thành "Đặt hàng & thanh toán" | — | ❌ | ❌ | ❌ | |

## 6.3 Đặt hàng & thanh toán (PAY)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PAY-01 | H | P0 | Giỏ hợp lệ | Chọn COD, bấm "Đặt hàng" | — | Đơn `CONFIRMED`, mã `FM…`; tồn kho giảm; món đã đặt rời khỏi giỏ; email "FitMe · Đơn hàng {mã} đã được xác nhận"; mở chi tiết đơn | ✅ | — | ✅ | ❌ | `OrderIntegrationTest`, `codOrder_sendsConfirmationAfterCommit`; commerce.spec chỉ chạy local |
| PAY-02 | H | P0 | Giỏ hợp lệ | Chọn PayOS, đặt hàng | — | Đơn `PENDING_PAYMENT`, chuyển sang trang PayOS; voucher ở trạng thái "Đang giữ" | ✅ | — | ❌ | ❌ | Không thanh toán thật trên prod |
| PAY-03 | H | P0 | Đơn PayOS chờ thanh toán | Thanh toán thành công trên PayOS | — | Webhook → đơn `CONFIRMED`, "Đã thanh toán"; trang `/orders/return` hiện "Thanh toán thành công"; gửi email | ✅ | ✅ | ❌ | ❌ | `payosReturnAndWebhook_markPaidIdempotently`, `payosOrder_sendsConfirmationOnlyOncePaid` |
| PAY-04 | E | P1 | Đơn PayOS | Huỷ trên trang PayOS | — | Về `/orders/return?status=cancel`: "Bạn đã hủy thanh toán"; đơn vẫn chờ thanh toán | — | ✅ | ❌ | ❌ | `commerce-utils.test parses PayOS order codes` |
| PAY-05 | E | P1 | Webhook chưa về | Mở trang return | — | "Đang chờ xác nhận thanh toán" + nút "Kiểm tra lại" | — | ❌ | ❌ | ❌ | |
| PAY-06 | W | P0 | — | Gửi webhook PayOS 2 lần cho cùng đơn | — | Chỉ xử lý 1 lần, không gửi 2 email | ✅ | — | — | ❌ | |
| PAY-07 | W | P0 | Chế độ live | Gửi webhook giả (sai chữ ký) | — | "Webhook PayOS không hợp lệ"; đơn không đổi | ✅ | — | — | ❌ | Chế độ mock không kiểm tra chữ ký — đảm bảo prod **không** chạy mock; BE `P0PayOsLiveWebhookIntegrationTest#forgedWebhookSignature_isRejectedAndOrderUnchanged` |
| PAY-08 | W | P0 | Chế độ live | Gửi webhook có chữ ký hợp lệ nhưng `code` báo thất bại | — | Đơn **không** được đánh dấu đã thanh toán | ✅ | — | — | ❌ | Đã sửa #1 (`8153a83`). Trước đây: Handler không xem mã kết quả; mọi payload hợp lệ đều coi là đã trả; BE `P0PayOsLiveWebhookIntegrationTest#signedFailureWebhook_doesNotMarkOrderPaid_whileSignedSuccessDoes` |
| PAY-09 | W | P0 | Đơn PayOS quá 30 phút chưa trả | Chờ job (chạy mỗi 60 giây) | — | Đơn `CANCELLED` lý do "Quá hạn thanh toán"; hoàn kho; trả voucher | ✅ | — | — | ❌ | `paymentTimeout_cancelsOrder_restoresStock_andVoucher` |
| PAY-10 | W | P0 | Đơn đã huỷ do quá hạn | Tiền về sau đó (webhook) | — | `paymentStatus = PAID`, đơn vẫn `CANCELLED`, ghi nhận cần hoàn tiền | ✅ | — | — | ❌ | `latePayosPayment_afterTimeoutCancel_isRecordedForRefund`. Chỉ có log + `refundDueVnd`, không có bảng hoàn tiền |
| PAY-11 | H | P1 | Đơn PayOS chờ thanh toán | Bấm "Thanh toán lại" ở chi tiết đơn | — | Tạo link PayOS mới | ❌ | ✅ | ❌ | ❌ | "allows retry pay only for pending PayOS orders" |
| PAY-12 | E | P2 | Đơn COD / đã trả | Tìm nút "Thanh toán lại" | — | Không hiển thị; API từ chối | ❌ | ✅ | — | ❌ | |
| PAY-13 | W | P0 | User A | Gọi `/orders/payos/return` với mã đơn của B | — | Bị từ chối, không đổi trạng thái | ✅ | — | — | ❌ | |
| PAY-14 | W | P0 | Giỏ hợp lệ | Bấm "Đặt hàng" 2 lần thật nhanh | — | Chỉ 1 đơn; tồn kho chỉ trừ 1 lần | ✅ | ❌ | ❌ | ❌ | BE `P0CommerceIntegrationTest#doubleSubmitSameCart_createsOneOrderAndReservesStockOnce` |
| PAY-15 | W | P0 | Sản phẩm còn 1 cái | 2 người đặt cùng lúc | — | 1 đơn thành công, người còn lại nhận "Sản phẩm đã hết hàng"; tồn kho không âm | ✅ | — | ❌ | ❌ | Có cập nhật có điều kiện nhưng chưa test đồng thời; BE `P0CommerceIntegrationTest#concurrentBuyersOfLastUnit_exactlyOneSucceedsAndStockNeverNegative` |
| PAY-16 | W | P1 | Voucher 1 cái | Đặt 2 đơn song song cùng voucher | — | Chỉ 1 đơn dùng được voucher | ❌ | — | — | ❌ | |
| PAY-17 | W | P1 | Voucher hết hạn sau khi xem trước | Đặt hàng | — | "Voucher đã hết hạn"; voucher chuyển EXPIRED | ❌ | — | — | ❌ | |
| PAY-18 | W | P1 | Dịch vụ PayOS lỗi | Đặt hàng PayOS | — | Báo lỗi rõ, không tạo đơn treo / không trừ kho vĩnh viễn | ❌ | — | — | ❌ | |

## 6.4 Đơn hàng phía khách (ORD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ORD-01 | H | P1 | Có nhiều đơn | Mở `/orders`, chuyển các tab | Tất cả / Chờ thanh toán / Đã xác nhận / Đang xử lý / Hoàn tất / Đã hủy | Danh sách lọc đúng; nhãn tiếng Việt | ✅ | ✅ | ❌ | ✅ | `commerce-labels.test`, `maps tab to status param`; prod 18 đơn |
| ORD-02 | H | P1 | — | Mở chi tiết đơn | — | Mã đơn, trạng thái, thanh toán, địa chỉ, món theo shop, tiền | ✅ | ✅ | ✅ | ✅ |  |
| ORD-03 | H | P1 | Đơn đang giao | Xem theo dõi vận chuyển | — | Đơn vị vận chuyển, mã vận đơn, lịch sử trạng thái tiếng Việt | ✅ | ✅ | ❌ | ❌ | `LogisticsIntegrationTest` |
| ORD-04 | H | P0 | Đơn `CONFIRMED` chưa giao | Bấm huỷ, nhập lý do | `Đặt nhầm size` | Đơn `CANCELLED`; hoàn kho; trả voucher; đơn đã trả tiền → "Đã hoàn tiền" | ✅ | ✅ | ❌ | ❌ | `cancel_restoresStock_releasesVoucher_andDeniesOtherUser` |
| ORD-05 | E | P1 | Có phần đơn đang giao | Bấm huỷ | — | "Đơn hàng đã được giao đi nên không thể hủy." | ❌ | ✅ | ❌ | ❌ | "allows cancel until shipping" |
| ORD-06 | E | P2 | — | Huỷ không nhập lý do | — | Dùng lý do mặc định "Khách hàng hủy đơn"; ô lý do tối đa 200 ký tự | — | ❌ | ❌ | ❌ | |
| ORD-07 | W | P0 | User A | Mở `/orders/{id của B}` / huỷ đơn của B | — | 403 / 404 | ✅ | — | ❌ | ❌ | |
| ORD-08 | E | P2 | Đơn đã huỷ | Huỷ lần nữa | — | "Đơn hàng không thể hủy" | ❌ | — | — | ❌ | |
| ORD-09 | H | P1 | Đơn 2 shop, cả 2 đã giao | Xem đơn | — | Đơn `COMPLETED`; COD chuyển "Đã thanh toán" | ✅ | — | ❌ | ❌ | `sellerFlow_andLogisticsDelivery_completeCodOrder` |
| ORD-10 | H | P2 | Đơn 2 shop, 1 shop huỷ phần của mình | Xem đơn | — | Đơn vẫn xử lý phần còn lại; số tiền cần hoàn tính đúng | ✅ | — | — | ❌ | `sellerCancelOnPaidMultiSellerOrder…` |
| ORD-11 | H | P2 | — | Danh sách đơn của khách | — | Không hiển thị thông tin người mua khác | ✅ | — | — | ❌ | `adminOrderList_showsBuyer_butConsumerListDoesNot` |
| ORD-12 | E | P2 | Chưa có đơn | Mở `/orders` | — | Trạng thái trống có nút mua sắm | — | ❌ | ❌ | ❌ | |
| ORD-13 | H | P2 | — | Kiểm tra định dạng tiền và ngày | — | Tiền dạng `359.000 ₫`; ngày giờ theo Việt Nam | — | ✅ | — | ✅ | `format-price.test`, "parses ISO, zone-less…" |

## 6.5 Địa chỉ giao hàng (ADR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADR-01 | H | P0 | Chưa có địa chỉ | `/profile/addresses` → thêm địa chỉ đủ trường | `Nguyễn Văn A`, `0901234567`, `Hồ Chí Minh`, `Quận 1`, `Bến Nghé`, `12 Lê Lợi` | Lưu; tự là mặc định | ✅ | ✅ | ❌ | ❌ | `AddressIntegrationTest` |
| ADR-02 | H | P1 | Có 1 địa chỉ | Thêm địa chỉ thứ 2, tích mặc định | — | Địa chỉ mới thành mặc định, địa chỉ cũ bỏ mặc định; danh sách: mặc định lên đầu | ✅ | ✅ | ❌ | ❌ | |
| ADR-03 | H | P1 | — | Sửa địa chỉ | — | Lưu thay đổi | ✅ | — | ❌ | ❌ | |
| ADR-04 | H | P1 | — | Xoá địa chỉ (xác nhận) | — | Biến mất khỏi danh sách | ✅ | — | ❌ | ❌ | |
| ADR-05 | E | P1 | — | Bỏ trống tên / SĐT / tỉnh / quận / phường / số nhà | — | "Vui lòng nhập tên người nhận" / "Vui lòng nhập số điện thoại" / "Vui lòng nhập …" | ❌ | ✅ | ❌ | ❌ | `validates required fields in Vietnamese` |
| ADR-06 | E | P1 | — | SĐT sai | `12345`, `0901-234`, `+1 555 0100` | "Số điện thoại không hợp lệ" | ❌ | ✅ | ❌ | ❌ | |
| ADR-07 | E | P2 | — | SĐT hợp lệ có dấu cách / chấm / gạch | `090 123 4567`, `+84901234567` | Được chấp nhận | — | ❌ | ❌ | ❌ | |
| ADR-08 | W | P2 | — | Gọi API với SĐT `abc` và tỉnh rỗng `""` | — | Bị từ chối | ✅ | — | — | ✅ | Đã sửa #34 (`d88f285`). Trước đây: Backend chấp nhận (không kiểm tra định dạng, chỉ chặn null) |
| ADR-09 | E | P2 | Có 2 địa chỉ | Xoá địa chỉ mặc định | — | Địa chỉ còn lại được đặt mặc định (hoặc checkout tự dùng địa chỉ đầu) | ❌ | — | ❌ | ❌ | Backend không tự chuyển mặc định |
| ADR-10 | E | P2 | Đang là mặc định | Bỏ tích mặc định rồi lưu | — | Ghi nhận: người dùng không còn địa chỉ mặc định | ❌ | — | — | ❌ | |
| ADR-11 | W | P0 | User A | Sửa / xoá địa chỉ của B | — | 404 "Địa chỉ không tồn tại" | ✅ | — | — | ❌ | `addressCrud_requiresOwner` |
| ADR-12 | W | P2 | — | Tên người nhận 300 ký tự | — | Báo lỗi độ dài, không 500 | ❌ | — | — | ❌ | DB giới hạn 255 |
| ADR-13 | W | P2 | — | Thêm 200 địa chỉ bằng script | — | Có giới hạn hợp lý | ❌ | — | — | ❌ | Không có giới hạn số địa chỉ |
