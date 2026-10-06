# 14 · Hạ tầng, tác vụ nền, hiệu năng & CI (INF / JOB / PERF / CI)

[← Mục lục](../TEST_CASES.md)

## Hiện trạng (đọc từ code & vận hành)

| Hạng mục | Hiện trạng |
|---|---|
| Triển khai | Frontend Next.js trên Vercel (tự deploy khi push); backend Spring Boot trên Render Free (deploy tay, khởi động lạnh ~3 phút) |
| CSDL | PostgreSQL, Flyway 24 file, mới nhất V25 (thiếu V5) |
| Storage | `local` hoặc `r2`; ảnh catalog / avatar mẫu phục vụ từ Vercel, ảnh upload từ R2 |
| Tác vụ nền | Hết hạn Pro 00:05 (giờ VN); hết hạn voucher 01:15 (giờ server); huỷ đơn quá hạn thanh toán mỗi 60 giây; poll job thử mặc mỗi 3 giây |
| Dịch vụ ngoài | Gemini, FASHN (qua máy chủ VTON), PayOS, Gmail relay, R2 |
| CI | `backend-test`, `frontend-unit`, `frontend-build`, `e2e` (chỉ smoke-routes, role-flows, rbac, mobile-nav) |

---

## 14.1 Triển khai & môi trường (INF)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| INF-01 | H | P0 | — | `GET /actuator/health` | — | 200 `UP` | — | — | ✅ | ✅ | |
| INF-02 | H | P0 | Có migration mới | Deploy backend | — | Flyway chạy tự động, không lỗi; dữ liệu cũ còn nguyên | ✅ | — | ✅ | ✅ | V25 chạy thành công trên prod |
| INF-03 | W | P1 | Migration lỗi giữa chừng | Deploy | — | Deploy thất bại rõ ràng, phiên bản cũ vẫn chạy | ❌ | — | — | ❌ | |
| INF-04 | H | P1 | — | Ảnh catalog, avatar mẫu (Vercel) và ảnh upload (R2) | — | Tải được, đúng URL công khai | ✅ | ✅ | — | ✅ | `MediaUrlResolverTest`, `R2StorageServiceTest`, `media-url.test` |
| INF-05 | W | P1 | Render Free đang ngủ | Mở trang gọi API lần đầu | — | UI hiện trạng thái chờ / thông báo đang khởi động; tự thử lại; không lỗi trắng | — | ❌ | — | ❌ | Đo được ~3 phút khởi động lạnh |
| INF-06 | W | P1 | Đang deploy chuyển phiên bản | Thao tác trên web | — | Gián đoạn ngắn; request lỗi được thử lại hoặc báo rõ | — | ❌ | — | ❌ | Quan sát: health lỗi vài giây khi chuyển; lần đăng nhập admin đầu bị lỗi |
| INF-07 | W | P1 | R2 lỗi / sai cấu hình | Upload ảnh | — | Báo lỗi upload rõ ràng (5xx / thông báo), không báo "hết phiên" | ✅ | — | — | ✅ | Đã sửa #32 (`d88f285`). Trước đây: Lỗi cấu hình R2 ném `IllegalStateException` → bị map thành 401 |
| INF-08 | W | P0 | Mất kết nối DB | Gọi API | — | 5xx "Đã xảy ra lỗi hệ thống"; tự phục hồi khi DB trở lại | ❌ | — | — | ❌ | |
| INF-09 | W | P1 | Máy chủ VTON / FASHN ngừng | Thử mặc | — | Báo lỗi, hoàn Fitken | ✅ | — | — | ❌ | Xem TRY-GEN-08..12 |
| INF-10 | W | P1 | Gemini ngừng | Chat | — | Engine luật vẫn trả outfit | ✅ | — | — | ❌ | Xem AI-GEM-03 |
| INF-11 | W | P1 | PayOS ngừng | Đặt hàng PayOS / mua Pro | — | Báo lỗi; vẫn đặt được COD | ❌ | — | — | ❌ | |
| INF-12 | W | P1 | Gmail relay ngừng | Đăng ký / quên mật khẩu | — | Thông báo thân thiện; không tạo tài khoản treo | ✅ | — | — | ❌ | |
| INF-13 | H | P1 | — | Biến môi trường prod bắt buộc | `JWT_SECRET`, `CORS_ORIGINS`, `FITME_FRONTEND_BASE_URL`, `MAIL_RELAY_*`, PayOS keys, R2, Gemini | Đủ và khác giá trị mặc định dev | — | — | — | ❌ | Rà danh sách trong `docs/DEPLOY_TEST.md` |
| INF-14 | W | P2 | Restart backend | Kiểm tra trạng thái bộ nhớ | — | Ghi nhận mất: captcha đang mở, bộ đếm sai mã, cooldown email, giới hạn chat | ❌ | — | — | ❌ | Lưu trong bộ nhớ, không chia sẻ nếu chạy nhiều instance |
| INF-15 | H | P2 | — | Sao lưu / khôi phục DB | — | Có bản sao lưu định kỳ, khôi phục được | — | — | — | ❌ | |

## 14.2 Tác vụ nền (JOB)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| JOB-01 | H | P0 | Đơn PayOS tạo 31 phút trước, chưa trả | Chờ ≤ 60 giây | — | Đơn huỷ "Quá hạn thanh toán", hoàn kho, trả voucher | ✅ | — | — | ❌ | `paymentTimeout_cancelsOrder…` |
| JOB-02 | H | P1 | Pro hết hạn hôm qua | Chờ 00:05 giờ VN | — | Gói EXPIRED, quỹ gói về 0, về Free | ❌ | — | — | ❌ | |
| JOB-03 | H | P2 | Voucher hết hạn | Chờ 01:15 | — | Voucher "Hết hạn" | ❌ | — | — | ❌ | Dùng múi giờ server (Render là UTC → 08:15 giờ VN) |
| JOB-04 | H | P1 | Job thử mặc đang PROCESSING | Chờ | — | Poll mỗi 3 giây đến khi xong / quá 120 giây | ✅ | — | — | ❌ | `TryOnAsyncVtonIntegrationTest` |
| JOB-05 | W | P1 | Render ngủ lúc 00:05 | Sáng hôm sau kiểm tra | — | Gói hết hạn vẫn được xử lý (job bắt kịp khi thức dậy) | ❌ | — | — | ❌ | Render Free ngủ → cron có thể bị lỡ |
| JOB-06 | W | P1 | Render ngủ khi có đơn PayOS chờ | Thức dậy sau 2 giờ | — | Đơn quá hạn được huỷ ngay lần chạy đầu tiên | ❌ | — | — | ❌ | |

## 14.3 Hiệu năng (PERF)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PERF-01 | W | P1 | Backend đã thức | 50 người dùng đồng thời duyệt khám phá + chi tiết sản phẩm trong 5 phút | k6 / JMeter | p95 < 1 giây, lỗi < 1% | ❌ | — | — | ❌ | Chưa có load test |
| PERF-02 | W | P1 | — | 20 người đồng thời chat AI | — | p95 < 20 giây; không lỗi 5xx | ❌ | — | — | ❌ | Phụ thuộc Gemini |
| PERF-03 | W | P1 | — | 10 người đồng thời đặt hàng cùng sản phẩm còn 5 cái | — | Đúng 5 đơn thành công, tồn kho = 0, không âm | ❌ | — | — | ❌ | Xem PAY-15 |
| PERF-04 | W | P2 | 1.000 sản phẩm | `GET /products` | — | < 1 giây, payload hợp lý | ❌ | — | — | ❌ | Không có phân trang |
| PERF-05 | H | P2 | — | Thời gian tải trang chủ (LCP) trên 4G | — | LCP < 2,5 giây | — | — | ❌ | ❌ | |
| PERF-06 | W | P2 | — | 10.000 dòng traffic / ngày trong 90 ngày | Mở `/admin/traffic?days=90` | < 2 giây | ❌ | — | — | ❌ | |

## 14.4 CI & quy trình kiểm thử (CI)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CI-01 | H | P0 | Push lên `main` | Xem GitHub Actions | — | 4 job xanh: backend-test, frontend-unit, frontend-build, e2e | ✅ | ✅ | ✅ | — | Xanh ở `ee9d956` |
| CI-02 | E | P1 | — | Sửa `try-on.spec.ts` theo giao diện mới (avatar đã mở) | — | Spec pass | — | — | ✅ | — | Đang lỗi thời |
| CI-03 | E | P1 | — | Đưa 19 spec E2E chưa chạy vào CI | — | Tất cả pass trên CI | — | — | ✅ | — | Ưu tiên: commerce, auth-flow, reset-password, brand-full, admin-full |
| CI-04 | E | P2 | — | Chạy E2E với `FITME_AUTH_MIN_FORM_MS` mặc định | — | Có ít nhất 1 test kiểm tra chống spam theo thời gian | — | — | ❌ | — | CI đặt 0 |
| CI-05 | E | P2 | — | Backend test dùng Testcontainers | — | Chạy được trên máy dev (hoặc có hướng dẫn DB local) | ✅ | — | — | — | Máy dev hiện rơi về DB local |
