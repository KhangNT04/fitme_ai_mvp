# 13 · Giao diện, điều hướng, tương thích & SEO (UI / NAV / RSP / A11Y / SEO)

[← Mục lục](../TEST_CASES.md)

## Hiện trạng (đọc từ code)

| Hạng mục | Hiện trạng |
|---|---|
| Header desktop | Khám phá, Thử mặc AI, Tủ đồ, Đã lưu, Nhận thưởng, icon "Tìm kiếm nhanh"; đã đăng nhập: số Fitken, giỏ hàng, tên / "Hồ sơ"; khách: "Đăng nhập", "Tư vấn AI" |
| Thanh điều hướng mobile | Trang chủ, Khám phá, Tư vấn AI (nút nổi), Thử mặc, Hồ sơ; ẩn ở `/brand*`, `/admin*`, `/auth*`, `/redirect*` và các bước wizard AI / thử mặc |
| Footer | Khám phá (Sản phẩm, Tư vấn AI, Thử mặc AI, Bảng giá FitMe Pro), Hỗ trợ (Câu hỏi thường gặp, Liên hệ, Chính sách bảo mật, Điều khoản), Đối tác (Brand Portal, Admin — chỉ desktop). Mobile chỉ hiện footer ở `/`, `/pricing`, `/contact`, `/privacy-policy`, `/terms` |
| Trang lỗi | **Không có** `not-found.tsx`, `error.tsx`, `loading.tsx` riêng → dùng trang mặc định của Next.js |
| SEO | Tiêu đề "FitMe AI — Tư vấn size & phối đồ bằng AI", OpenGraph vi_VN; sitemap 8 URL; robots chặn khu vực riêng tư |
| Analytics | GA4 / Clarity chỉ tải khi có ID; ghi nguồn (UTM / referrer) lần chạm đầu, lưu 30 ngày |

---

## 13.1 Điều hướng (NAV)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NAV-01 | H | P1 | Desktop | Bấm lần lượt các mục menu header | — | Mở đúng trang; mục hiện tại được tô sáng | — | — | ✅ | ✅ | navigation.spec |
| NAV-02 | H | P2 | — | Bấm logo | — | Về trang chủ | — | — | ✅ | ✅ |  |
| NAV-03 | H | P1 | Mobile | Bấm 5 tab thanh điều hướng dưới | — | Đúng route; tab hiện tại tô sáng | — | ✅ | ✅ | ❌ | `MobileBottomNav.test`, mobile-nav.spec |
| NAV-04 | E | P1 | Mobile | Mở `/auth/login`, `/ai/chat`, `/try-on/input`, `/admin/dashboard` | — | Thanh điều hướng dưới bị ẩn | — | ✅ | ✅ | ❌ | `mobile-chrome.test` |
| NAV-05 | E | P2 | Mobile, khách | Bấm tab "Hồ sơ" | — | Mở `/auth/login?redirect=%2Fprofile` | — | ✅ | ❌ | ❌ | |
| NAV-06 | H | P2 | Mobile | Bấm tab đang mở | — | Cuộn lên đầu trang, không tải lại | — | ✅ | ❌ | ❌ | "scrolls to top when tapping the active tab" |
| NAV-07 | H | P2 | Mobile | Mở chi tiết sản phẩm từ luồng thử mặc | — | Tab "Thử mặc" được tô sáng | — | ✅ | — | ❌ | |
| NAV-08 | H | P1 | — | Nút "Quay lại" ở các trang cấp 2 | — | Nhãn và đích đúng theo lịch sử; bỏ qua trang tạm (processing, cổng `/ai/start`, đăng nhập) | — | ✅ | — | ✅ | `nav-history.test`, `nav-context.test` |
| NAV-09 | H | P2 | Desktop | Bấm các link footer | — | Mở đúng trang; "Câu hỏi thường gặp" cuộn tới `/#faq` | — | — | ✅ | ✅ | navigation.spec "footer portal links load" |
| NAV-10 | E | P2 | Mobile | Mở `/discover` | — | Không hiện footer; mở `/pricing` thì hiện | — | ✅ | ❌ | ❌ | |
| NAV-11 | H | P2 | Mobile | Header thu gọn | — | Có tìm kiếm nhanh, không có menu hamburger | — | — | ✅ | ❌ | mobile-nav.spec |
| NAV-12 | H | P2 | Portal | Sidebar admin / brand | — | Đủ mục, đúng thứ tự, icon đúng (gồm "Avatar mẫu thử đồ") | — | ❌ | ✅ | ✅ | |
| NAV-13 | E | P2 | Portal | Header portal | — | "FitMe AI — Quản trị" / "— Thương hiệu", nút "Trang chủ", "Đăng xuất" | — | ❌ | ❌ | ✅ | |
| NAV-14 | H | P2 | — | Badge giỏ hàng | — | Bằng tổng số lượng trong giỏ, cập nhật ngay khi thêm / xoá | — | ❌ | ❌ | ✅ | |

## 13.2 Các trang & trạng thái chung (UI)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UI-01 | H | P0 | — | Quét toàn bộ trang theo 4 vai trò | 95 trang | Không crash, không 404, không 5xx, không lỗi console nghiêm trọng | — | — | ✅ | ✅ | smoke-routes (CI, tập con); crawl prod đầy đủ 04–05/10 |
| UI-02 | H | P1 | — | Trang chủ | — | Hero, nút "Bắt đầu tư vấn", các section, đánh giá nổi bật, FAQ | — | — | ✅ | ✅ | consultation-anonymous.spec |
| UI-03 | H | P2 | — | `/contact` | — | Thông tin liên hệ; ô trống nếu chưa cấu hình email / SĐT / fanpage | — | — | ✅ | ✅ | |
| UI-04 | H | P2 | — | `/privacy-policy`, `/terms` | — | Nội dung đầy đủ, đọc được trên mobile | — | — | ✅ | ✅ | |
| UI-05 | E | P1 | — | Mở URL không tồn tại | `/abcxyz`, `/login` | Trang 404 tiếng Việt có nút về trang chủ | — | — | ❌ | ✅ | Hiện là trang 404 mặc định của Next.js (tiếng Anh) |
| UI-06 | W | P1 | — | Gây lỗi render một trang | — | Trang lỗi thân thiện, có nút thử lại | — | — | ❌ | ❌ | Chưa có `error.tsx` |
| UI-07 | H | P1 | — | Định dạng tiền và ngày | — | `329.000 ₫`; ngày `dd/MM/yyyy`; giờ Việt Nam | — | ✅ | — | ✅ | `format-price.test`, `commerce-utils.test` |
| UI-08 | H | P1 | — | Thông báo lỗi khi API lỗi 400 / 401 / 403 / 404 / 409 / 413 / 429 / 500 / 502 / 503 / 504 | — | Thông báo tiếng Việt thân thiện tương ứng, không lộ lỗi kỹ thuật | — | ✅ | — | ✅ | `user-error-message.test` |
| UI-09 | H | P2 | — | Trạng thái đang tải | — | Skeleton / spinner ở các danh sách | — | ❌ | ❌ | ❌ | |
| UI-10 | H | P2 | — | Toast thông báo | — | Hiện góc màn hình, tự ẩn, không che nút quan trọng trên mobile | — | ❌ | ❌ | ❌ | |
| UI-11 | H | P2 | — | Tuyên bố miễn trừ AI | — | Hiện ở kết quả tư vấn / thử mặc | — | ✅ | — | ✅ | `Disclaimer.test` |
| UI-12 | H | P2 | — | Thanh tiến trình (FlowStepper) | — | Đúng bước ở luồng AI và thử mặc | — | ✅ | — | ✅ | `FlowStepper.test` |
| UI-13 | H | P2 | — | Độ rộng trang | — | Trang hẹp / rộng / toàn màn hình đúng thiết kế | — | ✅ | — | ✅ | `PageShell.test` |

## 13.3 Thiết bị & trình duyệt (RSP)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RSP-01 | H | P1 | iPhone 13 (390 px) | Đi hết luồng tư vấn → thử mặc → mua | — | Không vỡ layout, nút bấm được bằng ngón tay | — | — | ✅ | ❌ | mobile-nav.spec chỉ một phần |
| RSP-02 | W | P1 | Màn hình 320 px (iPhone SE) | Mở các trang chính | — | Không tràn ngang, chữ không bị cắt | — | — | ❌ | ❌ | |
| RSP-03 | W | P2 | Tablet 768–1024 px, xoay ngang | Mở các trang chính và portal | — | Bố cục hợp lý | — | — | ❌ | ❌ | |
| RSP-04 | W | P1 | Safari iOS | Upload ảnh, chia sẻ, đăng nhập, thanh toán | — | Hoạt động như Chrome | — | — | ❌ | ❌ | |
| RSP-05 | W | P2 | Firefox, Edge desktop | Đi luồng chính | — | Hoạt động như Chrome | — | — | ❌ | ❌ | |
| RSP-06 | W | P2 | Chrome Android, mạng 3G chậm | Mở trang chủ, khám phá | — | Hiện nội dung trong thời gian chấp nhận được, ảnh tải dần | — | — | ❌ | ❌ | |
| RSP-07 | E | P2 | iPhone có tai thỏ | Thanh điều hướng dưới | — | Không bị che bởi thanh home (safe area) | — | — | ❌ | ❌ | Có `viewportFit: cover` |
| RSP-08 | W | P2 | Bàn phím ảo mở trong chat | Gõ tin nhắn | — | Ô nhập không bị bàn phím che | — | — | ❌ | ❌ | |

## 13.4 Khả năng tiếp cận (A11Y)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A11Y-01 | W | P2 | — | Chỉ dùng bàn phím (Tab / Enter / Esc) đi luồng đăng nhập, tư vấn, thêm giỏ | — | Làm được hết; focus nhìn thấy rõ; Esc đóng dialog | — | ❌ | ❌ | ❌ | |
| A11Y-02 | W | P2 | — | Chạy Lighthouse Accessibility trang chủ, khám phá, chi tiết sản phẩm | — | Điểm ≥ 90 | — | — | ❌ | ❌ | |
| A11Y-03 | W | P2 | — | Trình đọc màn hình (VoiceOver / NVDA) | — | Ảnh có alt, nút icon có nhãn ("Tìm kiếm nhanh"…), form có label | — | ❌ | ❌ | ❌ | |
| A11Y-04 | W | P2 | — | Độ tương phản chữ / nền | — | Đạt WCAG AA | — | — | ❌ | ❌ | |
| A11Y-05 | W | P2 | — | Phóng to chữ 200% | — | Không vỡ bố cục | — | — | ❌ | ❌ | |

## 13.5 SEO & analytics (SEO)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEO-01 | H | P2 | — | Mở `/robots.txt` | — | Allow `/`; Disallow `/admin`, `/brand`, `/api`, `/auth`, `/profile`, `/checkout`, `/cart`; có link sitemap | — | — | ❌ | ❌ | |
| SEO-02 | H | P2 | — | Mở `/sitemap.xml` | — | 8 URL: `/`, `/discover`, `/try-on`, `/ai/start`, `/pricing`, `/contact`, `/privacy-policy`, `/terms` với domain prod | — | — | ❌ | ❌ | |
| SEO-03 | H | P2 | — | Chia sẻ trang chủ lên Facebook / Zalo | — | Xem trước có tiêu đề, mô tả, ảnh `/home-hero-bg.jpg` | — | — | — | ❌ | |
| SEO-04 | E | P2 | — | Trang sản phẩm có tiêu đề riêng | — | Tiêu đề chứa tên sản phẩm | — | — | ❌ | ❌ | |
| SEO-05 | H | P2 | Có `NEXT_PUBLIC_GA_ID` | Mở trang, xem Network | — | GA4 tải và ghi page view | — | ❌ | — | ❌ | |
| SEO-06 | E | P2 | Không có GA ID | Mở trang | — | Không tải script GA, không lỗi console | — | ❌ | — | ❌ | |
| SEO-07 | W | P2 | — | GA ID chứa ký tự lạ | `G-1"><script>` | Bị bỏ qua (chỉ chấp nhận `[A-Za-z0-9-]`) | — | ❌ | — | ❌ | |
| SEO-08 | H | P2 | — | Vào từ `?utm_source=tiktok`, sau đó vào từ `?utm_source=facebook` | — | Giữ nguồn đầu tiên (tiktok) trong 30 ngày | — | ✅ | — | ❌ | `attribution.test keeps the first touch` |
| SEO-09 | H | P2 | — | Vào từ link Google (không UTM) | — | Nguồn = `google.com`, medium "referral" | — | ✅ | — | ❌ | "falls back to the external referrer host" |
| SEO-10 | H | P2 | — | Lighthouse Performance / SEO trang chủ | — | Performance ≥ 70, SEO ≥ 90 | — | — | ❌ | ❌ | |
