# 02 · Phiên ẩn danh, hồ sơ cơ thể & vibe quiz (SES / PRO / QUIZ)

[← Mục lục](../TEST_CASES.md)

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Phiên ẩn danh | `POST /sessions/anonymous` trả token 32 ký tự hex; header `X-Anonymous-Session`; sống **30 ngày kể từ lúc tạo, không gia hạn**; token hết hạn hoặc lạ bị bỏ qua im lặng |
| Ghi dữ liệu | POST / PUT / PATCH / DELETE trên recommendations, wardrobe, uploads, previews, try-on, stylist/chat, me, privacy, redirects cần JWT **hoặc** session hợp lệ, nếu không trả 401 "Yêu cầu đăng nhập hoặc session ẩn danh" |
| Hồ sơ cơ thể | Chiều cao 100–230 cm; cân nặng 25–250 kg (FE làm tròn số nguyên); tuổi 13–80 (**FE bắt buộc, BE không bắt buộc**); giới tính Nữ / Nam / Khác; gu mặc Ôm / Vừa vặn / Thoải mái / Rộng / Chưa chắc (**FE bắt buộc, BE mặc định REGULAR**); tông da tuỳ chọn |
| Số đo chi tiết | Tuỳ chọn: vai 20–80, ngực 50–200, eo 40–180, bụng 40–180, hông 50–200, đùi 30–100, dài chân 50–120, dài tay 40–90 (chỉ FE kiểm tra) |
| Khách | Hồ sơ lưu localStorage `fitme-body-profile-guest`, tự xoá sau 30 ngày |
| Vibe quiz | Tuỳ chọn hoàn toàn: ngân sách (Dưới 300k / 300–500k / 500–800k / 800k+) và mục tiêu tủ đồ (chọn nhiều). "Xong — vào tư vấn" hoặc "Bỏ qua" đều sang `/ai/chat` |
| Hồ sơ phong cách | Giao diện đã gỡ: `/profile/style` → `/profile/body`, `/ai/style-profile` → `/ai/body-profile`; API vẫn còn |

---

## 2.1 Phiên ẩn danh (SES)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SES-01 | H | P0 | Trình duyệt mới, chưa đăng nhập | Bấm "Bắt đầu tư vấn" ở trang chủ | — | Tạo session; token lưu localStorage `fitme_session_token`; các request sau có header `X-Anonymous-Session` | ✅ | ✅ | ✅ | ✅ | `createAnonymousSession_returnsToken`, `use-ensure-session.test` |
| SES-02 | H | P1 | Đã có session hợp lệ | Tải lại trang tư vấn | — | Dùng lại session cũ (gọi `/sessions/current`), không tạo mới | ✅ | ✅ | ❌ | ❌ | "reuses existing session…" |
| SES-03 | E | P1 | Session trong localStorage đã hết hạn | Mở trang tư vấn | — | Tạo session mới, không báo lỗi | — | ✅ | ❌ | ❌ | "replaces an expired persisted session" |
| SES-04 | E | P2 | Store trống nhưng localStorage còn token | Mở trang tư vấn | — | Khôi phục session từ localStorage | — | ✅ | — | ❌ | "restores session from localStorage…" |
| SES-05 | W | P1 | Backend không tạo được session | Bấm "Bắt đầu tư vấn" | — | Quay về trang chủ, không crash | — | ✅ | ❌ | ❌ | "redirects home when session creation fails" |
| SES-06 | E | P2 | — | Gọi `GET /sessions/current` không có header | — | 404 "Không tìm thấy session hiện tại" | ✅ | — | — | ❌ | `getCurrentSession_withoutHeader_returnsNotFound` |
| SES-07 | W | P1 | — | Gọi `POST /wardrobe/items` không có JWT lẫn session | — | 401 "Yêu cầu đăng nhập hoặc session ẩn danh" | ❌ | — | — | ❌ | |
| SES-08 | W | P2 | — | Gọi API với header session là chuỗi rác | `X-Anonymous-Session: abc` | Bị coi như không có session (401 với API ghi) | ❌ | — | — | ❌ | |
| SES-09 | H | P0 | Có session với dữ liệu | Đăng nhập → `POST /sessions/link-to-user` | — | Hồ sơ cơ thể, hồ sơ phong cách, tủ đồ, gợi ý, thử mặc, ảnh thư viện chuyển sang tài khoản | ✅ | — | ❌ | ❌ | `linkToUser_migratesSessionDataToUser` |
| SES-10 | E | P2 | — | Gọi link-to-user với token không tồn tại / đã hết hạn | — | 404 "Session không tồn tại" / 400 "Session đã hết hạn"; FE bỏ qua lỗi, đăng nhập vẫn thành công | ❌ | — | — | ❌ | |
| SES-11 | E | P2 | Chưa đăng nhập | Gọi link-to-user | — | 401 "Yêu cầu đăng nhập" | ❌ | — | — | ❌ | |
| SES-12 | W | P2 | Session tạo cách đây 29 ngày, dùng hằng ngày | Mở lại sau 2 ngày | — | Session hết hạn (không gia hạn theo hoạt động); app tạo session mới | ❌ | ❌ | — | ❌ | Dữ liệu ẩn danh cũ không còn truy cập được |
| SES-13 | W | P1 | — | Dùng session của người khác đọc sự kiện redirect | — | 403 | ✅ | — | — | ❌ | `getEvent_withDifferentSession_returnsForbidden` |

## 2.2 Hồ sơ cơ thể (PRO)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PRO-01 | H | P0 | Khách mới | Mở `/ai/body-profile`, nhập đủ trường bắt buộc, bấm "Lưu và bắt đầu tư vấn" | 172 cm, 65 kg, 24 tuổi, Nam, Vừa vặn | Lưu thành công, chuyển `/ai/vibe-quiz`; khách thấy dòng "Bạn chưa đăng nhập: hồ sơ sẽ lưu trên máy trong 30 ngày." | ✅ | ✅ | ✅ | ✅ | `createAndGetBodyAndStyleProfiles`; prod 05/10 |
| PRO-02 | H | P0 | Đã đăng nhập | Lưu hồ sơ ở `/profile/body` | 160 cm, 50 kg, 30 tuổi, Nữ, Ôm, Sáng | Lưu lên server, quay về `/profile`; thẻ hồ sơ hiện "160cm · 50kg" | ✅ | — | ❌ | ❌ | |
| PRO-03 | E | P1 | — | Chiều cao 99 và 231 | — | "Chiều cao tối thiểu 100cm" / "Chiều cao tối đa 230cm" | ❌ | ❌ | ❌ | ❌ | |
| PRO-04 | E | P2 | — | Chiều cao 100 và 230 (biên) | — | Được chấp nhận | ❌ | ❌ | ❌ | ❌ | |
| PRO-05 | E | P1 | — | Cân nặng 24 và 251 | — | "Cân nặng tối thiểu 25kg" / "…tối đa 250kg" | ❌ | ✅ | ❌ | ❌ | `validators.test` |
| PRO-06 | E | P2 | — | Cân nặng thập phân | `65.7` | Làm tròn 66 kg | — | ✅ | — | ❌ | `form-number.test` |
| PRO-07 | E | P1 | — | Tuổi 12, 81, 25.5, để trống | — | "Tuổi tối thiểu 13" / "Tuổi tối đa 80" / "Tuổi phải là số nguyên" / "Nhập tuổi" | ❌ | ❌ | ❌ | ❌ | |
| PRO-08 | E | P1 | — | Không chọn giới tính | — | "Chọn giới tính" | — | ✅ | ❌ | ❌ | `validators.test "rejects missing gender"` |
| PRO-09 | E | P1 | — | Không chọn gu mặc | — | "Chọn gu mặc" | — | ✅ | ❌ | ❌ | `validators.test` |
| PRO-10 | E | P2 | — | Nhập chữ / số âm vào chiều cao | `abc`, `-170` | Báo lỗi số hợp lệ; không lưu | — | ✅ | ❌ | ❌ | `form-number.test` |
| PRO-11 | E | P2 | — | Mở phần số đo chi tiết, nhập ngực 30 (dưới 50), rồi thu gọn phần này và lưu | — | Lỗi vẫn được báo rõ ràng, người dùng biết vì sao không lưu được | — | ✅ | ❌ | ❌ | Đã sửa #42 (`73e0fc9`). Trước đây: Lỗi nằm trong phần có thể thu gọn nên bị che |
| PRO-12 | H | P2 | — | Nhập đủ 8 số đo chi tiết hợp lệ | Vai 42, ngực 90, eo 75, bụng 80, hông 95, đùi 55, dài chân 80, tay 60 | Lưu được; hồ sơ hiện các badge số đo | ✅ | ✅ | ❌ | ❌ | |
| PRO-13 | W | P2 | — | Gọi API với giới tính lạ | `gender: "ALIEN"` | 400 "Dữ liệu gửi lên không hợp lệ" | ❌ | — | — | ❌ | |
| PRO-14 | W | P2 | — | Gọi API với chiều cao 500 | — | 400 | ❌ | — | — | ❌ | Thông báo có thể là tiếng Anh (Hibernate) |
| PRO-15 | W | P2 | — | Gọi API với số đo âm / cực lớn | `chestCm: -5`, `99999` | Bị từ chối | ✅ | — | — | ✅ | Đã sửa #33 (`d88f285`). Trước đây: Backend không kiểm tra số đo |
| PRO-16 | E | P1 | Đã có hồ sơ đủ trường | Sửa chỉ chiều cao rồi lưu | — | Các trường khác (số đo, tông da, mục tiêu) không bị mất | — | ✅ | — | ❌ | `profile-merge.test` |
| PRO-17 | H | P1 | Khách | Lưu hồ sơ, đóng trình duyệt, mở lại sau 1 ngày | — | Form điền sẵn từ localStorage | — | ✅ | ❌ | ❌ | `local-profile-storage.test` |
| PRO-18 | E | P2 | Khách, hồ sơ lưu cách đây > 30 ngày | Mở `/ai/body-profile` | — | Form trống (đã tự xoá) | — | ✅ | — | ❌ | "expires after 30 days" |
| PRO-19 | W | P2 | Token hết hạn khi đang lưu | Bấm lưu | — | Token bị xoá, hồ sơ lưu dạng khách, vẫn sang bước tiếp | — | ❌ | ❌ | ❌ | Xử lý 401/403 |
| PRO-20 | W | P1 | Backend lỗi | Bấm lưu | — | Toast "Không lưu được hồ sơ. Vui lòng thử lại."; dữ liệu đã nhập không mất | — | ❌ | ❌ | ❌ | |
| PRO-21 | E | P1 | Chưa có hồ sơ | Mở `/ai/chat`, `/ai/start` | — | Chuyển `/ai/body-profile?required=1`, banner "Cần nhập hồ sơ cơ thể trước khi tư vấn…" | — | ✅ | ✅ | ✅ | Crawl prod |
| PRO-22 | E | P2 | — | Mở `/profile/style`, `/ai/style-profile` | — | Chuyển tới `/profile/body` / `/ai/body-profile` | — | — | ✅ | ✅ | |
| PRO-23 | H | P1 | Đã có hồ sơ | Mở form thử mặc `/try-on/input` | — | Chiều cao, cân nặng điền sẵn từ hồ sơ | — | ✅ | — | ✅ | `profile-prefill.test` |
| PRO-24 | E | P2 | Chưa có hồ sơ | Gọi `GET`, `PUT`, `DELETE /me/body-profile` | — | 404 "Chưa có body profile" | ❌ | — | — | ❌ | |
| PRO-25 | H | P2 | Đã có hồ sơ | `DELETE /me/body-profile` | — | Xoá thành công; mở tư vấn bị yêu cầu nhập lại | ❌ | — | — | ❌ | |
| PRO-26 | E | P2 | — | So sánh quy tắc FE và BE: gọi API thiếu tuổi và gu mặc | — | API chấp nhận (tuổi null, gu REGULAR) | ❌ | — | — | ❌ | Ghi nhận khác biệt FE/BE |

## 2.3 Vibe quiz (QUIZ)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| QUIZ-01 | H | P1 | Đã lưu hồ sơ | Chọn ngân sách "300–500k" + 2 mục tiêu, bấm "Xong — vào tư vấn" | — | Mục tiêu lưu vào hồ sơ (`budget:300-500`…); sang `/ai/chat`; chat tự tải 3 outfit gợi ý | ❌ | ✅ | ✅ | ✅ | role-flows |
| QUIZ-02 | H | P1 | — | Bấm "Bỏ qua" | — | Sang `/ai/chat`, không lưu gì | — | ❌ | ❌ | ❌ | |
| QUIZ-03 | E | P2 | — | Chọn ngân sách khác sau khi đã chọn | — | Chỉ giữ 1 lựa chọn ngân sách | — | ❌ | ❌ | ❌ | |
| QUIZ-04 | E | P2 | — | Chọn rồi bỏ chọn các mục tiêu | — | Danh sách mục tiêu cập nhật đúng | — | ❌ | ❌ | ❌ | |
| QUIZ-05 | W | P2 | Lưu mục tiêu lỗi | Bấm "Xong — vào tư vấn" | — | Toast "Không lưu được thông tin. Thử lại nhé."; vẫn vào được chat | — | ❌ | ❌ | ❌ | |
| QUIZ-06 | E | P1 | Chọn "Dưới 300k" | Vào chat, xem outfit | — | Outfit ưu tiên sản phẩm rẻ | ✅ | — | ❌ | ❌ | Đã sửa #41 (`73e0fc9`). Trước đây: Ngân sách chỉ gửi cho Gemini dạng chữ, chat không lọc theo giá |
| QUIZ-07 | H | P2 | — | Xem thanh tiến trình "Hồ sơ → Vibe → Tư vấn" | — | Bước hiện tại được tô sáng | — | ✅ | — | ✅ | `FlowStepper.test` |
