# FitMe AI — Development Timeline phần mềm (Tuần 1–14)

> Bản này chỉ gồm công việc phát triển phần mềm (code, test, hạ tầng, bảo mật, vận hành kỹ thuật). Marketing, liên hệ brand và bán hàng nằm ở [DEVELOPMENT_TIMELINE.md](./DEVELOPMENT_TIMELINE.md).
> Giả định tuần 1 bắt đầu thứ Hai 07/09/2026.
> Web app: https://fitme-ai-mvp.vercel.app · Backend: Render · DB: Neon · Media: Cloudflare R2 · Thanh toán: PayOS (live).

## Nguyên tắc

- Phần tính năng lớn đã xong ở tuần 1–5. Từ tuần 6 chỉ làm việc nhỏ, mỗi tuần 2–3 việc, khoảng 4–6 giờ.
- Mọi thay đổi đi qua cùng một vòng: commit → CI xanh (backend, frontend, E2E) → deploy Render/Vercel → bộ hồi quy prod.
- Không lưu mật khẩu, API key hay thông tin DB prod trong code hoặc tài liệu.
- Chỉ số lấy từ công cụ có sẵn: GitHub Actions (test, CI), Render (log, thời gian khởi động), Admin › Tăng trưởng / Khách quay lại, bộ hồi quy prod `frontend/e2e-prod`.

## Tổng quan 14 tuần

| Tuần | Thời gian | Giai đoạn | Mục tiêu kỹ thuật |
|---|---|---|---|
| 1 | 07–13/09 | Xây dựng | Đối chiếu bản deploy với yêu cầu, sửa lỗi luồng chính, CI xanh |
| 2 | 14–20/09 | Xây dựng | *(không có commit, nhóm điền)* |
| 3 | 21–27/09 | Xây dựng | Xác thực email thật qua HTTPS |
| 4 | 28/09–04/10 | Xây dựng | Ví Fitken, gói trả phí, PayOS, dashboard tăng trưởng, tracking |
| 5 | 05–11/10 | Xây dựng | Sửa 50 lỗi prod, chuyển sang Brand Plus, catalog Shopee thật, ảnh thử đồ do brand chọn |
| 6 | 12–18/10 | Ổn định | Đổi secret bị lộ, sao lưu DB, sửa các lỗi bảo mật còn lại |
| 7 | 19–25/10 | Ổn định | Công cụ nhận brand mới: bàn giao tài khoản, nhập catalog, kiểm duyệt lại khi sửa sản phẩm |
| 8 | 26/10–01/11 | Ổn định | Chịu tải khi ra mắt: giới hạn tần suất, index DB, giảm cold start |
| 9 | 02–08/11 | Cải tiến | Sửa top 5 lỗi từ phản hồi, (tuỳ chọn) APK dạng PWA/TWA |
| 10 | 09–15/11 | Cải tiến | Độ tin cậy thanh toán: đối soát PayOS, theo dõi webhook |
| 11 | 16–22/11 | Cải tiến | Email nhắc quay lại, hoàn thiện lọc brand yêu thích |
| 12 | 23–29/11 | Cải tiến | Giám sát lỗi và uptime, dịch vụ thử đồ bền hơn |
| 13 | 30/11–06/12 | Hoàn thiện | Khoá tính năng, kiểm thử toàn bộ, cập nhật tài liệu |
| 14 | 07–13/12 | Hoàn thiện | Phát hành bản cuối, bàn giao mã nguồn và hạ tầng |

## Chi tiết từng tuần

### Tuần 1 (07–13/09) — Đối chiếu bản deploy, sửa luồng chính ✅
- **Việc làm:** đối chiếu web đang chạy với checklist EXE201 ([EXE201_DEPLOY_GAP_2026-09-06.md](./EXE201_DEPLOY_GAP_2026-09-06.md)). Thêm captcha khi đăng ký. Sửa lỗi catalog, chat tư vấn, thử đồ và form hồ sơ cơ thể. Đưa CI về xanh.
- **Thành công nghĩa là:** luồng đăng ký → tư vấn → thử đồ chạy trên prod không có lỗi chặn.
- **Chỉ số:** CI xanh; 0 lỗi chặn ở luồng chính; 36 sản phẩm công khai.

### Tuần 2 (14–20/09) — *(nhóm điền)*
- Không có commit code. Nếu nhóm có làm thiết kế, review hoặc lập kế hoạch kỹ thuật thì ghi vào đây; nếu không thì ghi là tuần lập kế hoạch.

### Tuần 3 (21–27/09) — Xác thực email thật ✅
- **Việc làm:** gửi mã xác thực và link đặt lại mật khẩu qua email thay vì hiện trên giao diện. Template email mang thương hiệu FitMe. Chuyển sang gửi qua HTTPS (Resend hoặc relay) vì Render chặn cổng SMTP. Thêm test GreenMail.
- **Thành công nghĩa là:** người dùng đăng ký và khôi phục mật khẩu bằng email thật.
- **Chỉ số:** gửi mail trên prod thành công 100% khi kiểm tra; test email chạy trong CI.

### Tuần 4 (28/09–04/10) — Thanh toán và đo lường ✅
- **Việc làm:**
  - Ví Fitken, gói trả phí cho người dùng, phần thưởng điểm danh / chia sẻ / đánh giá.
  - Tích hợp PayOS (checkout, webhook có kiểm tra chữ ký).
  - Dashboard tăng trưởng và báo cáo khách trả tiền cho admin.
  - Tracking UTM, GA4, Microsoft Clarity.
  - Quản lý tài khoản cho admin, đổi mật khẩu, avatar mẫu cho thử đồ, email giao dịch.
- **Thành công nghĩa là:** web thu được tiền và đo được người dùng đến từ kênh nào.
- **Chỉ số:** webhook PayOS xử lý đúng và không xử lý trùng; GA4/Clarity nhận lượt truy cập; smoke test prod pass.

### Tuần 5 (05–11/10) — Brand Plus và catalog thật ✅
- **Việc làm:**
  - Rà soát prod, sửa 50 lỗi.
  - Bỏ bán hàng trên web, mọi nút mua chuyển sang shop của brand. Thêm Premium, trần Fitken, Brand Plus 999.000đ, voucher, lead có đồng ý chia sẻ, dashboard khách quay lại.
  - Thay shop ảo bằng 7 brand thật cào từ Shopee (70 sản phẩm). Ảnh được sao chép lên Cloudflare R2.
  - Brand tự chọn ảnh dùng để thử đồ cho từng sản phẩm. Sản phẩm không có ảnh thử đồ bị chặn thử.
  - Sửa lỗi từ đợt review code:
    - Mật khẩu seed không còn trong cấu hình prod; mỗi brand có tài khoản riêng.
    - Dịch vụ thử đồ yêu cầu khoá nội bộ và chặn tải URL nội bộ (SSRF).
    - Đồng bộ catalog không ghi đè chỉnh sửa của brand.
- **Thành công nghĩa là:** luồng tư vấn → thử đồ → bấm mua → lead cho brand chạy trên prod với dữ liệu thật.
- **Chỉ số:** 431 test backend, 290 test frontend, 44 test dịch vụ thử đồ pass; CI xanh; bộ hồi quy prod pass; 556/556 ảnh trên R2; migration V1–V35.

### Tuần 6 (12–18/10) — Bảo mật và sao lưu
- **Việc làm:**
  1. Đổi các secret từng bị lộ: mật khẩu ba tài khoản seed trên prod, key Resend, các key trong `.env` local (Gemini, HF, SMTP). Xoá `FITME_SEED_PASSWORD` và các biến cũ trên Render.
  2. Viết quy trình sao lưu Neon (tạo branch trước mỗi lần chạy migration) và thử khôi phục một lần.
  3. Sửa các lỗi review còn mở:
     - `PreviewService` chưa kiểm tra chủ sở hữu ảnh;
     - `SessionService` gán phiên cho người khác khi dùng chung trình duyệt;
     - frontend tự đăng xuất khi refresh token gặp lỗi mạng;
     - cảnh báo hydration ở thanh điều hướng mobile.
- **Thành công nghĩa là:** không còn secret bị lộ và có thể khôi phục DB nếu migration lỗi.
- **Chỉ số:** 0 lỗi Critical/High đang mở; 1 lần khôi phục thử thành công; CI xanh.

### Tuần 7 (19–25/10) — Công cụ nhận brand mới
- **Việc làm:**
  1. Hoàn thiện luồng bàn giao tài khoản brand (Admin › Users › "Đăng nhập") và viết hướng dẫn 1 trang.
  2. Gom script cào và nhập catalog thành một quy trình lặp lại được cho brand mới, kèm đánh giá ảnh thử đồ.
  3. Sản phẩm đã duyệt mà brand sửa link mua hoặc ảnh thì quay về chờ duyệt. Chặn URL ảnh dạng `javascript:` / `data:`.
- **Thành công nghĩa là:** nhóm thêm một brand mới mà không phải sửa code.
- **Chỉ số:** thêm 1 brand mới trong ≤ 30 phút; 100% ảnh sản phẩm nằm trên R2; 100% sản phẩm có link mua hợp lệ.

### Tuần 8 (26/10–01/11) — Chịu tải khi ra mắt
- **Việc làm:**
  1. Giới hạn tần suất theo IP cho đăng nhập, tạo phiên, chat tư vấn và captcha (chống tốn chi phí Gemini).
  2. Thêm index còn thiếu (`product_images`, `product_variants`, `size_charts`, lượt thử đồ theo người dùng và ngày).
  3. Giảm cold start của Render: health check định kỳ hoặc màn hình chờ thân thiện khi backend đang khởi động.
- **Thành công nghĩa là:** web chịu được lượt truy cập từ đợt marketing mà không chậm hay tốn chi phí bất thường.
- **Chỉ số:** API phản hồi p95 < 800 ms khi đã chạy nóng; 0 lỗi 5xx do quá tải trong tuần ra mắt.

### Tuần 9 (02–08/11) — Sửa lỗi từ phản hồi
- **Việc làm:**
  1. Lấy top 5 lỗi hoặc điểm khó dùng từ phản hồi và bản ghi Clarity, sửa và deploy.
  2. *(Tuỳ chọn, nhẹ)* đóng gói web thành APK dạng PWA/TWA để có bản Android.
- **Thành công nghĩa là:** các vấn đề người dùng thật gặp nhiều nhất đã được sửa.
- **Chỉ số:** 5/5 vấn đề ưu tiên đã deploy; mỗi lỗi sửa có test đi kèm.

### Tuần 10 (09–15/11) — Độ tin cậy thanh toán
- **Việc làm:**
  1. Trang hoặc script đối soát đơn PayOS với đơn trong DB (Premium và Brand Plus).
  2. Cảnh báo khi webhook lỗi hoặc đơn treo quá 30 phút; kiểm tra gia hạn và hết hạn gói chạy đúng.
- **Thành công nghĩa là:** mọi giao dịch thật đều được ghi nhận đúng.
- **Chỉ số:** 100% đơn PayOS khớp với DB; 0 đơn đã trả tiền mà chưa kích hoạt gói.

### Tuần 11 (16–22/11) — Giữ chân người dùng
- **Việc làm:**
  1. Job gửi email nhắc người dùng không quay lại sau 7 ngày (có link huỷ nhận).
  2. Chế độ "Chỉ brand yêu thích" lọc cứng, không lẫn brand khác; sản phẩm tương tự cũng tôn trọng brand yêu thích.
- **Thành công nghĩa là:** hệ thống chủ động kéo người dùng quay lại và gợi ý đúng ý người dùng Premium.
- **Chỉ số:** email nhắc gửi thành công ≥ 95%; D7 hiển thị đúng ở Admin › Khách quay lại; có test cho chế độ lọc.

### Tuần 12 (23–29/11) — Giám sát và độ bền
- **Việc làm:**
  1. Gắn theo dõi lỗi (ví dụ Sentry gói miễn phí) và theo dõi uptime (ví dụ UptimeRobot) cho frontend, backend và dịch vụ thử đồ.
  2. Dịch vụ thử đồ: giới hạn số job lưu trong bộ nhớ, ẩn lỗi nội bộ khỏi người dùng, chạy pytest trong CI.
- **Thành công nghĩa là:** nhóm biết có lỗi trước khi người dùng báo.
- **Chỉ số:** uptime ≥ 99% trong tuần; lượt thử đồ thành công ≥ 85%; 0 lỗi P0.

### Tuần 13 (30/11–06/12) — Khoá tính năng, kiểm thử cuối
- **Việc làm:**
  1. Ngừng thêm tính năng. Chạy toàn bộ test backend, frontend, E2E, pytest và bộ hồi quy prod.
  2. Cập nhật API_CONTRACT, DEVELOPER_GUIDE, TEST_CASES và sơ đồ kiến trúc theo bản cuối.
- **Thành công nghĩa là:** bản cuối ổn định và tài liệu khớp với code.
- **Chỉ số:** 100% test pass; hồi quy prod pass 100%; 0 lỗi P0/P1 đang mở.

### Tuần 14 (07–13/12) — Phát hành và bàn giao
- **Việc làm:**
  1. Gắn tag phát hành `v1.0` và ghi release notes.
  2. Bàn giao mã nguồn, cách deploy, danh sách biến môi trường (không kèm giá trị), quy trình sao lưu và khôi phục.
- **Thành công nghĩa là:** người khác nhận lại có thể chạy local và deploy mà không cần hỏi nhóm.
- **Chỉ số:** chạy local theo DEVELOPER_GUIDE trong ≤ 30 phút; demo trọn luồng không lỗi.

## Thành tích kỹ thuật tuần 1–5

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Kiến trúc | Modular monolith Spring Boot 3.3.5 / Java 21; frontend Next.js 16; dịch vụ thử đồ FastAPI gọi FASHN | `backend/`, `frontend/`, `ai-services/vton` |
| Hạ tầng | Vercel + Render + Neon + Cloudflare R2; deploy bằng Docker; CI trên GitHub Actions | URL đầu tài liệu; GitHub Actions |
| Luồng cốt lõi | Đăng ký → hồ sơ cơ thể → tư vấn AI (Gemini + rule dự phòng) → chọn size → thử đồ AI → chuyển sang shop của brand | Bộ hồi quy prod |
| Xác thực | Captcha, email xác thực và đặt lại mật khẩu qua HTTPS, JWT, phân quyền admin/brand/user | Commit tuần 1 và 3 |
| Thanh toán | PayOS live cho Premium và Brand Plus, webhook kiểm tra chữ ký và không xử lý trùng, voucher | Commit tuần 4–5 |
| Dữ liệu | 35 migration Flyway; 7 brand thật, 70 sản phẩm, 556 ảnh trên R2; mỗi sản phẩm có đúng một ảnh thử đồ | Admin › Sản phẩm |
| Bảo mật | Không còn mật khẩu trong cấu hình; tài khoản brand riêng; dịch vụ thử đồ có khoá nội bộ và chặn SSRF; prod không khởi động nếu PayOS ở chế độ giả | Commit `2880420` |
| Chất lượng | 431 test backend, 290 test frontend, 44 test dịch vụ thử đồ, E2E Playwright, bộ hồi quy prod | GitHub Actions |
