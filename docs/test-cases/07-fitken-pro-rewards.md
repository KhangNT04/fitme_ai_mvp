# 07 · Fitken, gói Pro, nhận thưởng & voucher (FIT / SUB / RWD / VCH)

[← Mục lục](../TEST_CASES.md)

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Ví Fitken | Tặng **5 Fitken** dùng thử đúng 1 lần (lần đầu chạm ví). Hai quỹ: quỹ gói (mất khi Pro hết hạn) và quỹ thưởng (không hết hạn). Chỉ thử mặc AI tốn Fitken (1 / lần) |
| Gói Pro | `PRO_MONTHLY` 49.000đ / 30 ngày, +15 Fitken vào quỹ gói, **0 voucher freeship**. Gia hạn khi còn hạn thì cộng dồn từ ngày hết hạn cũ |
| Gói nạp | Hiện **không có gói nạp nào được seed**; admin tạo được gói TOPUP (không kèm voucher) |
| Hết hạn | Job 00:05 hằng ngày (giờ VN): Pro quá hạn → EXPIRED, xoá quỹ gói, về FREE |
| Thanh toán gói | Mock: đánh dấu đã trả ngay khi checkout; live: chỉ webhook đánh dấu đã trả |
| Điểm danh | 1 lần / ngày (giờ VN); chuỗi liên tiếp; **+1 Fitken mỗi khi chuỗi chia hết cho 3** (ngày 3, 6, 9…) |
| Chia sẻ | +3 Fitken, tối đa 1 lần / ngày; link `https` tới bài viết cụ thể trên facebook.com, fb.watch, tiktok.com, instagram.com, threads.net, x.com, twitter.com; link được chuẩn hoá, **trùng trên toàn hệ thống** bị từ chối; **tự động duyệt**, admin chỉ có thể từ chối (thu hồi Fitken) |
| Voucher | Trạng thái Có thể dùng / Đang giữ / Đã dùng / Hết hạn; chỉ phát qua gói Pro (hiện 0) |
| Admin | Điều chỉnh Fitken −10.000..10.000 (khác 0); cấp / huỷ Pro (cấp = 30 ngày + 15 Fitken, không thu tiền) |

---

## 7.1 Ví Fitken (FIT)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FIT-01 | H | P0 | Tài khoản vừa xác minh | Mở `/rewards` hoặc xem header | — | Số dư 5 Fitken; lịch sử có dòng "Tặng 5 Fitken dùng thử" | ✅ | — | ❌ | ❌ | `trialFitkenIsGrantedExactlyOnce` |
| FIT-02 | W | P0 | Đã nhận 5 Fitken thử | Gọi ví nhiều lần / song song | — | Không nhận thêm Fitken thử | ✅ | — | — | ❌ | |
| FIT-03 | H | P1 | Có giao dịch | Xem lịch sử | — | Đủ loại giao dịch (tặng, dùng, hoàn, thưởng, admin điều chỉnh), mới nhất trước, 20 dòng / trang | ❌ | — | ❌ | ✅ | |
| FIT-04 | E | P1 | Khách | Gọi `GET /me/fitken` | — | Bị chặn (403) | ✅ | — | — | ✅ | `walletRequiresLogin` |
| FIT-05 | W | P0 | — | Trừ và hoàn Fitken cùng mã tham chiếu 2 lần | — | Chỉ trừ / hoàn 1 lần | ✅ | — | — | — | `consumeAndRefundAreIdempotentPerReference` |
| FIT-06 | E | P1 | Có 2 Fitken quỹ gói + 3 quỹ thưởng | Thử mặc 1 lần | — | Trừ quỹ gói trước | ❌ | — | — | ❌ | |
| FIT-07 | W | P1 | Số dư 0 | Admin điều chỉnh −5 | — | Số dư vẫn 0 (không âm) | ❌ | — | — | ❌ | |
| FIT-08 | H | P1 | — | Số Fitken trên header | — | Khớp số dư ví; bấm vào mở `/rewards` | — | ❌ | ❌ | ✅ | |

## 7.2 Bảng giá & gói Pro (SUB)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SUB-01 | H | P1 | — | Mở `/pricing` (không cần đăng nhập) | — | Gói Free và Pro 49.000đ/tháng: "15 Fitken mỗi tháng", "Tạo ảnh AI Try-on chất lượng cao"…; không còn nhắc freeship | ✅ | — | ❌ | ✅ | `plansArePublic` |
| SUB-02 | H | P0 | Đăng nhập, gói Free | Bấm mua Pro → thanh toán PayOS thành công | — | Gói Pro 30 ngày; +15 Fitken; không có voucher; email "FitMe · Gói Pro đã được kích hoạt"; `/billing/return` "Thanh toán thành công!" | ✅ | — | ❌ | ❌ | `mockProCheckoutGrantsFitkenWithoutFreeshipVouchers`, `proCheckout_sendsPlanPurchasedEmail` |
| SUB-03 | E | P1 | — | Huỷ trên trang PayOS | — | `/billing/return`: "Thanh toán đã bị hủy."; gói không đổi | — | ❌ | ❌ | ❌ | |
| SUB-04 | E | P1 | Chế độ live, webhook chưa về | Mở `/billing/return?status=success` | — | Hiện "đang chờ xác nhận", **không** báo thành công khi chưa trả | ❌ | ✅ | — | ❌ | Đã sửa #24 (`d88f285`). Trước đây: Hiện luôn báo "Thanh toán thành công!" khi gọi return thành công |
| SUB-05 | W | P0 | User A | Gọi return với mã đơn gói của B | — | Bị từ chối | ✅ | — | — | ❌ | `returnForSomeoneElsesOrderIsRejected` |
| SUB-06 | H | P1 | Pro còn 10 ngày | Mua thêm 1 tháng | — | Hạn mới = hạn cũ + 30 ngày; +15 Fitken | ❌ | — | — | ❌ | |
| SUB-07 | E | P1 | Pro hết hạn hôm qua | Đợi job 00:05 | — | Trạng thái EXPIRED; quỹ gói về 0 (ghi "EXPIRE_RESET"); quỹ thưởng giữ nguyên; về Free | ❌ | — | — | ❌ | |
| SUB-08 | H | P1 | Admin tạo gói TOPUP 10 Fitken | Người dùng mua gói nạp | — | +10 Fitken quỹ thưởng; email "FitMe · Đã cộng Fitken vào ví của bạn" | ❌ | — | ❌ | ❌ | Chưa có gói nạp trên prod |
| SUB-09 | E | P2 | Gói đã tắt | Gọi checkout với gói đó | — | "Gói không còn khả dụng" | ❌ | — | — | ❌ | |
| SUB-10 | W | P0 | — | Gửi webhook gói 2 lần | — | Chỉ cộng Fitken 1 lần | ✅ | — | — | ❌ | Unique theo tham chiếu; BE `P0CommerceIntegrationTest#subscriptionWebhookDeliveredTwice_creditsFitkenOnce` |
| SUB-11 | E | P2 | Đơn gói chờ thanh toán lâu | — | — | Đơn gói hết hạn sau một thời gian | ✅ | — | — | ❌ | Đã sửa #25 (`d88f285`). Trước đây: Trạng thái CANCELLED / EXPIRED của đơn gói không bao giờ được đặt |
| SUB-12 | H | P2 | Người dùng Pro | Xem banner nâng cấp | — | Banner Pro bị ẩn | — | ❌ | ❌ | ❌ | |
| SUB-13 | H | P2 | — | Xem 10 đơn gói gần nhất | — | Danh sách đúng | ❌ | — | — | ❌ | |

## 7.3 Điểm danh hằng ngày (RWD-CHK)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RWD-CHK-01 | H | P1 | Chưa điểm danh hôm nay | Bấm điểm danh | — | Chuỗi +1; dải 7 ngày cập nhật | ❌ | — | ❌ | ❌ | |
| RWD-CHK-02 | H | P1 | Đã điểm danh 2 ngày liên tiếp | Điểm danh ngày 3 | — | +1 Fitken ("CHECKIN_REWARD") | ✅ | — | ❌ | ❌ | `thirdConsecutiveCheckinGrantsReward` |
| RWD-CHK-03 | H | P2 | Chuỗi 5 | Điểm danh ngày 6 | — | +1 Fitken | ❌ | — | — | ❌ | |
| RWD-CHK-04 | E | P1 | Đã điểm danh hôm nay | Bấm lần nữa | — | "Hôm nay bạn đã điểm danh rồi, quay lại vào ngày mai nhé!" | ❌ | — | ❌ | ❌ | |
| RWD-CHK-05 | E | P1 | Chuỗi 2, bỏ 1 ngày | Điểm danh | — | Chuỗi về 1 | ❌ | — | — | ❌ | |
| RWD-CHK-06 | W | P1 | — | Điểm danh 23:59 rồi 00:01 (giờ VN) | — | Tính là 2 ngày liên tiếp | ❌ | — | — | ❌ | |
| RWD-CHK-07 | W | P1 | — | Gửi 2 request điểm danh song song | — | Chỉ 1 thành công (khoá duy nhất) | ❌ | — | — | ❌ | |
| RWD-CHK-08 | E | P1 | Khách | Mở `/rewards`, gọi API | — | Yêu cầu đăng nhập | ✅ | — | ❌ | ❌ | `rewardsRequireLogin` |

## 7.4 Thưởng chia sẻ (RWD-SHR)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RWD-SHR-01 | H | P0 | Chưa được thưởng chia sẻ hôm nay | Dán link bài đăng, gửi | `https://www.facebook.com/user/posts/123` | +3 Fitken ngay; trạng thái "Đã duyệt" | ✅ | — | ❌ | ❌ | `shareRewardRespectsDailyLimit…` |
| RWD-SHR-02 | E | P1 | Đã được thưởng hôm nay | Gửi link khác | — | `SHARE_DAILY_LIMIT` | ✅ | — | ❌ | ❌ | |
| RWD-SHR-03 | E | P1 | Link đã được ai đó dùng | Gửi lại link (biến thể `m.`, `?fbclid=…`, `/` cuối) | `https://m.facebook.com/user/posts/123/?fbclid=x` | "Link bài đăng này đã được dùng để nhận thưởng" | ✅ | — | ❌ | ❌ | Chuẩn hoá link |
| RWD-SHR-04 | E | P1 | — | Link sai | `http://facebook.com/x`, `https://google.com/a`, `https://facebook.com/`, `https://user:pw@facebook.com/p` | `SHARE_INVALID_URL` | ✅ | — | ❌ | ❌ | `shareUrlValidation` |
| RWD-SHR-05 | H | P2 | — | Link TikTok, Instagram, Threads, X | — | Được chấp nhận | ✅ | — | — | ❌ | |
| RWD-SHR-06 | E | P2 | — | Link > 1000 ký tự | — | Bị từ chối | ❌ | — | — | ❌ | |
| RWD-SHR-07 | W | P1 | — | Gửi kèm `galleryImageId` của người khác | — | Bị từ chối | ❌ | — | — | ❌ | |
| RWD-SHR-08 | H | P1 | Từ thư viện ảnh | Bấm "Dán link nhận thưởng" | — | Mở `/rewards?galleryImageId=…` với ảnh đã gắn | — | ❌ | ❌ | ❌ | |
| RWD-SHR-09 | H | P1 | Admin | `/admin/rewards` → từ chối 1 lượt chia sẻ | `Bài đăng đã bị xoá` | Trạng thái "Đã từ chối"; Fitken bị thu hồi | ✅ | — | ❌ | ❌ | |
| RWD-SHR-10 | E | P2 | — | Toast sau khi gửi | — | Báo đã cộng Fitken | — | ✅ | ❌ | ❌ | Đã sửa #45 (`73e0fc9`). Trước đây: Toast ghi "Admin sẽ duyệt và cộng Fitken sớm nhé!" trong khi đã cộng ngay |
| RWD-SHR-11 | W | P1 | — | Gửi link bài đăng giả (bài không tồn tại) | — | Ghi nhận: hệ thống không xác minh bài đăng, phụ thuộc admin kiểm tra | ❌ | — | — | ❌ | Rủi ro gian lận Fitken |
| RWD-SHR-12 | W | P2 | — | Gửi 2 link khác nhau song song | — | Chỉ 1 được thưởng | ❌ | — | — | ❌ | |

## 7.5 Voucher (VCH)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| VCH-01 | H | P1 | — | Mở `/rewards?tab=vouchers` | — | Danh sách voucher sắp theo hạn; nhãn Có thể dùng / Đang giữ / Đã dùng / Hết hạn | ❌ | — | ❌ | ✅ | API vouchers prod |
| VCH-02 | E | P2 | Chưa có voucher | Mở tab voucher | — | Trạng thái trống | — | ❌ | ❌ | ✅ | |
| VCH-03 | E | P1 | Khách | Gọi `GET /me/vouchers` | — | "Cần đăng nhập để xem voucher" | ❌ | — | — | ❌ | |
| VCH-04 | H | P1 | Voucher quá hạn | Đợi job 01:15 | — | Chuyển "Hết hạn" | ❌ | — | — | ❌ | Job dùng múi giờ server, không phải giờ VN |
| VCH-05 | H | P1 | Voucher đang giữ cho đơn PayOS | Đơn bị huỷ | — | Voucher về "Có thể dùng" (nếu chưa hết hạn) | ✅ | — | — | ❌ | |
