# FitMe AI — Development Timeline (Tuần 1–14)

> Giả định tuần 1 bắt đầu thứ Hai 07/09/2026. Nếu lịch học khác, chỉ cần dời ngày, nội dung giữ nguyên.
> Web app: https://fitme-ai-mvp.vercel.app · Backend: Render · DB: Neon · Thanh toán: PayOS (live).

## Nguyên tắc lập kế hoạch

- Mỗi tuần tối đa 2–3 việc, khoảng 4–6 giờ cho cả nhóm. Phần code nặng đã xong ở tuần 1–5; từ tuần 6 chủ yếu là vận hành thật, sửa lỗi nhỏ và đo số liệu.
- Mọi chỉ số đều đọc được từ công cụ có sẵn, không cần làm thêm:
  - **Admin › Tăng trưởng**: đăng ký, người trả tiền, doanh thu gói.
  - **Admin › Khách quay lại**: DAU/WAU/MAU, D1/D7/D30.
  - **Brand › Dashboard / Khách quan tâm**: số khách thử đồ, lead, đã bán.
  - **GA4 + Microsoft Clarity**: lượt truy cập theo kênh (UTM).
  - **GitHub Actions**: CI.
- Mỗi lần sửa code đều qua cùng một vòng: commit → CI xanh → deploy → kiểm tra trên prod.

## Tổng quan 14 tuần

| Tuần | Thời gian | Giai đoạn | Mục tiêu chính |
|---|---|---|---|
| 1 | 07–13/09 | Xây dựng | Kiểm tra bản deploy so với yêu cầu EXE201, sửa lỗi luồng chính |
| 2 | 14–20/09 | Xây dựng | *(nhóm điền: hoạt động không code)* |
| 3 | 21–27/09 | Xây dựng | Xác thực email thật cho đăng ký / quên mật khẩu |
| 4 | 28/09–04/10 | Xây dựng | Mô hình kinh doanh B2C, ví Fitken, dashboard tăng trưởng, tracking marketing |
| 5 | 05–11/10 | Xây dựng | Rà soát toàn bộ prod (50 lỗi) và chuyển sang mô hình Brand Plus |
| 6 | 12–18/10 | Sẵn sàng vận hành | Dọn dữ liệu test, bảo mật, bộ tài liệu cho brand |
| 7 | 19–25/10 | Vận hành thật | Đưa 5 brand tiên phong lên hệ thống |
| 8 | 26/10–01/11 | Vận hành thật | Ra mắt marketing trên 2 kênh |
| 9 | 02–08/11 | Vận hành thật | Thu phản hồi, sửa top 5 vấn đề, (tuỳ chọn) bản APK |
| 10 | 09–15/11 | Doanh thu | Bán gói Brand Plus và Premium đầu tiên |
| 11 | 16–22/11 | Doanh thu | Lead → đã bán, giữ chân người dùng |
| 12 | 23–29/11 | Doanh thu | Đạt ≥ 20 người trả tiền |
| 13 | 30/11–06/12 | Hoàn thiện | Khoá tính năng, kiểm thử cuối, tổng hợp số liệu |
| 14 | 07–13/12 | Hoàn thiện | Demo cuối kỳ, bàn giao |

## Chi tiết từng tuần

### Tuần 1 (07–13/09) — Kiểm tra bản deploy, sửa luồng chính ✅
- **Việc làm:** đối chiếu web đang chạy với checklist EXE201 (OC1/OC2/OC3) và ghi lại các thiếu sót ([EXE201_DEPLOY_GAP_2026-09-06.md](./EXE201_DEPLOY_GAP_2026-09-06.md)). Siết bảo mật đăng ký (captcha), sửa lỗi ở catalog, chat tư vấn, thử đồ và form hồ sơ cơ thể, đưa CI về xanh.
- **Thành công nghĩa là:** người lạ vào web, đăng ký, được tư vấn phối đồ và thử đồ mà không gặp lỗi chặn.
- **Chỉ số:** CI xanh; luồng chính đăng ký → tư vấn → thử đồ chạy được trên prod; 36 sản phẩm công khai; admin dashboard có 120 lượt tư vấn và 44 lượt thử đồ (06/09).

### Tuần 2 (14–20/09) — *(nhóm điền)*
- Tuần này không có commit code. Nhóm điền hoạt động không code đã làm (ví dụ: khảo sát người dùng, liên hệ brand, chuẩn bị marketing). Nếu không có hoạt động nào thì ghi là tuần nghỉ hoặc lập kế hoạch.

### Tuần 3 (21–27/09) — Xác thực email thật ✅
- **Việc làm:** gửi mã xác thực qua email thay vì hiện ngay trên giao diện; email mang thương hiệu FitMe; chuyển sang gửi qua HTTPS để chạy được trên Render; có test tự động cho phần gửi mail.
- **Thành công nghĩa là:** người dùng thật đăng ký và khôi phục mật khẩu bằng email của chính họ.
- **Chỉ số:** tỉ lệ gửi mail thành công trên prod 100% khi kiểm tra; có test GreenMail chạy trong CI.

### Tuần 4 (28/09–04/10) — Mô hình B2C và đo lường ✅
- **Việc làm:**
  - Ví Fitken, gói trả phí cho người dùng, phần thưởng điểm danh / chia sẻ / đánh giá.
  - Dashboard tăng trưởng và báo cáo khách trả tiền cho admin.
  - Gắn tracking UTM, GA4 và Microsoft Clarity để đo marketing.
  - Quản lý tài khoản cho admin, trang đổi mật khẩu, avatar mẫu cho thử đồ, email giao dịch.
- **Thành công nghĩa là:** web có cách thu tiền và đo được người dùng đến từ kênh nào.
- **Chỉ số:** dashboard tăng trưởng hiển thị số liệu thật; GA4 và Clarity nhận được lượt truy cập; script smoke test trên prod pass.

### Tuần 5 (05–11/10) — Rà soát prod và chuyển sang Brand Plus ✅ (đã xong phần code)
- **Việc làm:**
  - Rà soát toàn bộ prod, sửa 50 lỗi.
  - Chuyển mô hình: bỏ bán hàng trên web, mọi nút mua dẫn sang web của brand.
  - Người dùng có gói Premium; Fitken có trần do admin đặt.
  - Brand có gói Plus 999.000đ, kèm voucher "Brand tiên phong" giảm 50%.
  - Lead khách quan tâm (có đồng ý chia sẻ); dashboard khách quay lại cho admin.
- **Thành công nghĩa là:** toàn bộ luồng đăng ký → tư vấn → thử đồ → bấm mua → lead cho brand chạy trên prod.
- **Chỉ số:** 398 test backend, 283 test frontend, 137 test E2E đều pass trên CI; bộ hồi quy prod pass 7/7.

### Tuần 6 (12–18/10) — Sẵn sàng vận hành thật
- **Việc làm:**
  1. Dọn dữ liệu test trên prod, đổi các key/mật khẩu từng bị lộ (Resend, mật khẩu seed), xoá biến môi trường cũ trên Render.
  2. Viết bộ tài liệu 1 trang và quay video demo 3 phút cho brand: cách đăng sản phẩm, gói Plus, trang Khách quan tâm.
- **Thành công nghĩa là:** có thể mời brand và người dùng thật vào mà không lo dữ liệu rác hay lộ key.
- **Chỉ số:** checklist go-live hoàn thành 100%; 0 lỗi P0 đang mở.

### Tuần 7 (19–25/10) — Đưa 5 brand tiên phong lên hệ thống
- **Việc làm:**
  1. Liên hệ và duyệt 5 brand local, phát voucher "Brand tiên phong" (3 voucher/brand) tại `/admin/vouchers`.
  2. Hỗ trợ brand đăng sản phẩm có link mua thật và bảng size.
- **Thành công nghĩa là:** người dùng tư vấn xong thấy đồ của brand thật và bấm mua sang đúng web của brand.
- **Chỉ số:** ≥ 5 brand được duyệt; ≥ 50 sản phẩm thật đang hiển thị; 100% sản phẩm có link mua hợp lệ.

### Tuần 8 (26/10–01/11) — Ra mắt marketing trên 2 kênh
- **Việc làm:**
  1. Đăng nội dung trên 2 kênh (ví dụ TikTok và group Facebook thời trang), mỗi kênh dùng link UTM riêng.
  2. Mỗi kênh 3–4 bài/video ngắn: "AI chọn size giúp bạn", "thử đồ online".
- **Thành công nghĩa là:** có người dùng thật đến từ cả 2 kênh và đo được kênh nào hiệu quả hơn.
- **Chỉ số (GA4 + Admin › Tăng trưởng):** ≥ 300 lượt truy cập; ≥ 50 tài khoản mới; tỉ lệ đăng ký trên lượt truy cập theo từng kênh.

### Tuần 9 (02–08/11) — Thu phản hồi và sửa nhanh
- **Việc làm:**
  1. Gửi form phản hồi 5 câu cho người dùng và brand; xem lại bản ghi phiên trên Clarity.
  2. Sửa 5 vấn đề được phản ánh nhiều nhất (giữ ở mức sửa nhỏ).
  3. *(Tuỳ chọn, nhẹ)* đóng gói web thành APK dạng PWA/TWA để có bản Android cho OC1.
- **Thành công nghĩa là:** sản phẩm được chỉnh theo phản hồi thật, không chỉ theo phỏng đoán của nhóm.
- **Chỉ số:** ≥ 15 phản hồi; 5/5 vấn đề ưu tiên đã sửa và deploy; điểm hài lòng trung bình ≥ 4/5.

### Tuần 10 (09–15/11) — Bán gói đầu tiên
- **Việc làm:**
  1. Chốt gói Brand Plus với các brand tiên phong (giảm 50% bằng voucher, thanh toán qua PayOS).
  2. Chạy khuyến mãi Premium ngắn hạn cho người dùng (admin chỉnh giá và thời gian giảm, không cần code).
- **Thành công nghĩa là:** có doanh thu thật đi qua PayOS.
- **Chỉ số (Admin › Tăng trưởng / Khách trả tiền):** ≥ 3 brand mua Plus; ≥ 10 người dùng mua Premium; doanh thu ghi nhận khớp với PayOS.

### Tuần 11 (16–22/11) — Lead thành đơn, giữ chân người dùng
- **Việc làm:**
  1. Nhắc brand Plus vào trang Khách quan tâm, liên hệ khách và tick "Đã bán".
  2. Gửi email nhắc người dùng chưa quay lại; khuyến khích điểm danh nhận Fitken.
- **Thành công nghĩa là:** brand thấy FitMe mang lại khách thật, người dùng quay lại dùng tiếp.
- **Chỉ số:** ≥ 30 lead; ≥ 5 lead được brand xác nhận đã bán; tỉ lệ quay lại D7 ≥ 15% (Admin › Khách quay lại).

### Tuần 12 (23–29/11) — Đạt mục tiêu người trả tiền
- **Việc làm:**
  1. Đẩy chuyển đổi cuối: nhắc người dùng đang dùng thử, đề nghị gia hạn với brand.
  2. Theo dõi độ ổn định: lỗi trên Render, thời gian phản hồi.
- **Thành công nghĩa là:** đạt chỉ tiêu OC3 với hệ thống chạy ổn định.
- **Chỉ số:** ≥ 20 người trả tiền (Premium + Brand Plus); web truy cập được ≥ 99% thời gian trong tuần; 0 lỗi P0.

### Tuần 13 (30/11–06/12) — Khoá tính năng, kiểm thử cuối
- **Việc làm:**
  1. Ngừng thêm tính năng; chạy lại bộ hồi quy prod và test E2E.
  2. Chụp màn hình dashboard (tăng trưởng, khách quay lại, lead của brand) làm bằng chứng cho báo cáo.
- **Thành công nghĩa là:** web ổn định để demo và số liệu đã sẵn sàng cho báo cáo.
- **Chỉ số:** hồi quy prod pass 100%; 0 lỗi P0/P1 đang mở; bộ số liệu cuối kỳ đầy đủ.

### Tuần 14 (07–13/12) — Demo cuối kỳ và bàn giao
- **Việc làm:**
  1. Tập demo luồng thật: người dùng tư vấn → thử đồ → bấm mua → brand thấy lead → admin xem số liệu.
  2. Nộp báo cáo, bàn giao tài khoản và tài liệu (USER_GUIDE, DEVELOPER_GUIDE).
- **Thành công nghĩa là:** hội đồng thấy sản phẩm chạy thật, có người dùng và doanh thu thật.
- **Chỉ số:** demo trọn luồng trong ≤ 10 phút không lỗi; báo cáo nộp đúng hạn.

## Thành tích tuần 1–4

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Web app chạy công khai | Frontend trên Vercel, backend trên Render, DB trên Neon; mỗi lần push đều chạy CI tự động | URL ở đầu tài liệu; GitHub Actions |
| Luồng cốt lõi | Đăng ký → hồ sơ cơ thể → tư vấn phối đồ bằng AI (gợi ý size, form, màu) → thử đồ AI → bấm mua | Kiểm thử trên prod ngày 06/09 |
| Xác thực tài khoản | Mã xác thực và link đặt lại mật khẩu gửi qua email thật, có captcha khi đăng ký | Commit tuần 3 |
| Mô hình kinh doanh | Ví Fitken, gói trả phí cho người dùng, phần thưởng giữ chân (điểm danh, chia sẻ, đánh giá), thanh toán PayOS | Commit 04/10 |
| Đo lường | Dashboard tăng trưởng, báo cáo khách trả tiền, theo dõi nguồn truy cập bằng UTM, GA4 và Clarity | Trang Admin › Tăng trưởng |
| Quản trị | Admin quản lý tài khoản, duyệt brand và sản phẩm; brand có portal riêng | `/admin`, `/brand` |
| Dữ liệu sử dụng (06/09) | 11 người dùng hoạt động, 48 sản phẩm, 120 lượt tư vấn, 44 lượt thử đồ | Admin dashboard |
| Chất lượng | CI xanh; có test backend, unit test frontend và E2E Playwright | GitHub Actions |
