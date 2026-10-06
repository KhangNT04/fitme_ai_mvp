# 10 · Cổng thương hiệu — Brand portal (BR)

[← Mục lục](../TEST_CASES.md)

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Đăng ký brand | Chỉ tài khoản USER; FE: tên ≥ 2 ký tự, email hợp lệ, website là URL hoặc rỗng; BE: chỉ bắt buộc tên. Trạng thái Chờ duyệt / Đã duyệt / Từ chối / Tạm ngưng. Bị từ chối thì gửi lại được. Duyệt → role BRAND_OWNER (phải đăng nhập lại) |
| Brand chưa duyệt | Sản phẩm, dashboard, phân tích báo "Brand chưa được duyệt. Trạng thái: X". **Đơn hàng, đối soát, tài khoản nhận tiền không kiểm tra trạng thái brand** |
| Sản phẩm | Tạo → Bản nháp; "Gửi duyệt" → Chờ duyệt (**từ bất kỳ trạng thái nào**); admin duyệt → Đang hiển thị (chỉ chặn khi thiếu ảnh); Ẩn → Tạm ẩn; chỉ xoá vĩnh viễn được sản phẩm Tạm ẩn |
| Sửa sản phẩm | Không đổi trạng thái (sản phẩm đang hiển thị không cần duyệt lại); **xoá và tạo lại toàn bộ ảnh, biến thể, tag, bảng size → tồn kho về 100, ID biến thể đổi** |
| Kiểm tra form | FE chỉ bắt "Cần ít nhất 1 ảnh sản phẩm" + trường HTML required; BE chỉ bắt tên, danh mục, giá không null. **Không chặn giá âm, không kiểm tra link mua** |
| Đơn seller | Chờ xác nhận → Đã xác nhận → Đã đóng gói → Đang giao → Đã giao; huỷ được từ 3 trạng thái đầu (hoàn kho). Không xác nhận / đóng gói khi đơn cha đang chờ thanh toán |
| Vận chuyển | GHN / GHTK / Viettel Post / Shop tự giao; mã vận đơn ≤ 100 ký tự, tự sinh nếu trống, không trùng |
| Đối soát | Giữ 7 ngày sau khi giao; hoa hồng 10% |
| Chỉ số | CTR = min(1, click mua ÷ lượt xem); Try-on → Mua = min(1, click mua ÷ lượt thử có sản phẩm brand) |

---

## 10.1 Đăng ký đối tác brand (BR-APP)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-APP-01 | H | P0 | Đăng nhập USER chưa gửi đơn | `/brand/onboarding` → điền tên, email, SĐT, website, Shopee, mô tả → gửi | `QA Brand`, `qa.brand@gmail.com` | Chuyển `/brand/pending`: "Đơn đăng ký đang chờ admin duyệt" | ✅ | — | ✅ | ❌ | `apply_asUser_createsPendingBrand`; role-flows |
| BR-APP-02 | E | P1 | — | Tên 1 ký tự / email sai / website `abc` | — | "Tên thương hiệu tối thiểu 2 ký tự" / "Email không hợp lệ" / lỗi URL | ❌ | ❌ | ❌ | ❌ | |
| BR-APP-03 | E | P2 | Không nhập email liên hệ | Gửi đơn | — | Email liên hệ = email tài khoản | ❌ | — | — | ❌ | |
| BR-APP-04 | E | P1 | Đã có đơn chờ duyệt | Gửi đơn lần 2 | — | "Bạn đã gửi đơn đăng ký brand" | ❌ | — | ❌ | ❌ | |
| BR-APP-05 | H | P1 | Đơn bị từ chối | `/brand/pending` → "Gửi lại đơn" | — | Đơn quay lại "Chờ duyệt" với thông tin mới | ❌ | — | ❌ | ❌ | |
| BR-APP-06 | H | P0 | Admin vừa duyệt | Brand mở `/brand/pending` → "Đăng xuất và đăng nhập lại" → đăng nhập `/brand/login` | — | Vào `/brand/dashboard` | ✅ | — | ✅ | ❌ | `approveBrand_elevatesUserRole`; role-flows |
| BR-APP-07 | E | P2 | Khách | Mở `/brand/onboarding` | — | Nút "Đăng ký" / "Đăng nhập" kèm redirect về onboarding | — | ❌ | ❌ | ✅ | |
| BR-APP-08 | E | P2 | Khách | Mở `/brand/pending` | — | Chuyển `/auth/login?redirect=/brand/pending` | — | ❌ | ❌ | ❌ | |
| BR-APP-09 | E | P2 | Tài khoản BRAND | Mở `/brand/onboarding` | — | Chuyển về dashboard | — | ❌ | ❌ | ❌ | |
| BR-APP-10 | E | P2 | Admin / brand gọi API đăng ký | — | — | "Chỉ tài khoản người dùng mới có thể đăng ký brand" | ❌ | — | — | ❌ | |
| BR-APP-11 | E | P2 | Đơn đang chờ | Đăng nhập `/brand/login` | — | Bị từ chối (chưa có role BRAND), hướng dẫn xem trạng thái | ❌ | — | ✅ | ❌ | |
| BR-APP-12 | W | P1 | Brand bị tạm ngưng | Đăng nhập và mở portal | — | Bị chặn toàn bộ portal | ✅ | — | ❌ | ❌ | Đã sửa #3 (`8153a83`). Trước đây: Brand tạm ngưng vẫn giữ role, vẫn xử lý đơn và đối soát được |
| BR-APP-13 | W | P2 | — | Mô tả / tên chứa HTML | — | Hiển thị như văn bản ở trang brand công khai và admin | ❌ | ❌ | ❌ | ❌ | |

## 10.2 Quản lý sản phẩm (BR-PRD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-PRD-01 | H | P0 | Brand đã duyệt | `/brand/products/new` → điền đủ → lưu | Tên `Áo QA`, Áo, 299000, màu `Đen, Trắng`, size `S, M, L`, 2 ảnh, link mua `https://shopee.vn/x` | Tạo "Bản nháp"; 6 biến thể (2 màu × 3 size) tồn kho 100; ảnh đầu là ảnh chính | ✅ | ✅ | ✅ | ❌ | `createProduct_withVariantsAndImages`, `product-mapper.test`; brand-full.spec |
| BR-PRD-02 | H | P0 | Có bản nháp | Bấm "Gửi duyệt" | — | "Chờ duyệt"; admin thấy trong hàng chờ | ✅ | — | ✅ | ❌ | `createAndSubmitReview_asBrandOwner`; role-flows |
| BR-PRD-03 | E | P1 | — | Lưu khi chưa có ảnh | — | "Cần ít nhất 1 ảnh sản phẩm" | — | ❌ | ❌ | ❌ | |
| BR-PRD-04 | E | P1 | — | Giá âm / 0 | `-1000`, `0` | Bị từ chối với thông báo giá hợp lệ | ✅ | ✅ | ❌ | ✅ | Đã sửa #11 (`8153a83`). Trước đây: FE và BE đều chấp nhận giá âm |
| BR-PRD-05 | E | P1 | — | Link mua `abc` / `javascript:alert(1)` | — | Báo link không hợp lệ khi lưu | ✅ | ❌ | ❌ | ✅ | Đã sửa #22 (`d88f285`). Trước đây: Không kiểm tra khi lưu; chỉ khiến nút mua bị ẩn |
| BR-PRD-06 | E | P2 | — | Bỏ trống màu và size | — | Tạo 1 biến thể mặc định Đen / M | — | ✅ | ❌ | ❌ | |
| BR-PRD-07 | E | P2 | — | Tên 1.000 ký tự | — | Báo lỗi độ dài | ❌ | ❌ | — | ❌ | Không có giới hạn |
| BR-PRD-08 | H | P1 | — | Upload ảnh JPG / PNG / WEBP nhiều file | — | Ảnh hiển thị; gợi ý "JPG, PNG, WEBP — tối đa 5MB" | ❌ | ✅ | ❌ | ❌ | |
| BR-PRD-09 | E | P2 | — | Upload ảnh > 5 MB / GIF | — | "Ảnh tối đa 5MB." / "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP." | ❌ | ✅ | ❌ | ❌ | |
| BR-PRD-10 | W | P2 | Brand A và B upload ảnh cùng tên | — | — | Ảnh không ghi đè lẫn nhau | ❌ | — | — | ❌ | Tên file có tiền tố brandId; cùng brand cùng tên thì ghi đè |
| BR-PRD-11 | H | P1 | Sản phẩm đang hiển thị, đã có người mua | Sửa mô tả rồi lưu | — | Lưu được; sản phẩm vẫn hiển thị; tồn kho giữ nguyên | ✅ | — | ✅ | ❌ | Đã sửa #8 (`8153a83`). Trước đây: Sửa làm tồn kho về 100 và đổi ID biến thể (ảnh hưởng giỏ hàng đang có) |
| BR-PRD-12 | E | P1 | Sản phẩm đang hiển thị | Sửa giá / ảnh | — | Ghi nhận: thay đổi lên ngay, không cần admin duyệt lại | ❌ | — | ❌ | ❌ | Rủi ro nội dung |
| BR-PRD-13 | E | P2 | Sản phẩm đang hiển thị | Bấm "Gửi duyệt" | — | Không cho gửi duyệt lại sản phẩm đã duyệt (hoặc ghi rõ hành vi) | ❌ | — | ❌ | ❌ | Hiện chuyển về "Chờ duyệt" → biến mất khỏi cửa hàng |
| BR-PRD-14 | H | P1 | — | Bấm "Ẩn" → xác nhận | — | "Tạm ẩn"; biến mất khỏi `/discover` | ❌ | — | ❌ | ❌ | |
| BR-PRD-15 | E | P2 | Đã ẩn | Ẩn lần nữa (API) | — | "Sản phẩm đã được ẩn" | ❌ | — | — | ❌ | |
| BR-PRD-16 | H | P1 | Sản phẩm Tạm ẩn | Bấm "Xóa" → xác nhận | — | Xoá vĩnh viễn | ❌ | — | ❌ | ❌ | |
| BR-PRD-17 | E | P1 | Sản phẩm đang hiển thị | Xoá (API) | — | "Chỉ có thể xóa vĩnh viễn sản phẩm đã ẩn (Tạm ẩn)" | ❌ | — | — | ❌ | |
| BR-PRD-18 | W | P1 | Sản phẩm Tạm ẩn có trong giỏ / đơn của khách | Xoá vĩnh viễn | — | Đơn cũ vẫn xem được tên sản phẩm; giỏ hàng xử lý êm | ❌ | — | — | ❌ | |
| BR-PRD-19 | H | P2 | — | Danh sách sản phẩm | — | Bản nháp và chờ duyệt lên trước; nhãn trạng thái tiếng Việt | — | ✅ | ✅ | ✅ | `sort-brand-products.test`, `status-labels.test` |
| BR-PRD-20 | W | P0 | Brand A | Sửa / ẩn / xoá / gửi duyệt sản phẩm của brand B (API) | — | Bị từ chối | ✅ | — | — | ❌ | Hiện trả 400 "Sản phẩm không thuộc brand của bạn" (nên là 403); BE `P0PortalIntegrationTest#brandCannotReadEditHideDeleteOrSubmitAnotherBrandsProduct` |
| BR-PRD-21 | W | P1 | Brand A | Xem phân tích sản phẩm của brand B | — | Bị từ chối | ✅ | — | — | ✅ | Đã sửa #2 (`8153a83`). Trước đây: Không kiểm tra sở hữu; lộ số lượt thử của brand B |
| BR-PRD-22 | H | P2 | — | `/brand/products/{id}/analytics` | — | Lượt click, hoàn cảnh, size, màu có dữ liệu | ✅ | — | ✅ | ✅ | Đã sửa #23 (`d88f285`). Trước đây: Backend không trả hoàn cảnh / size / màu → 3/4 biểu đồ luôn trống |
| BR-PRD-23 | W | P2 | — | Khách / user thường gọi API sản phẩm brand | — | 403 | ✅ | — | — | ❌ | `createProduct_withoutAuth_returnsForbidden` |

## 10.3 Đơn hàng seller (BR-ORD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-ORD-01 | H | P0 | Có đơn COD "Chờ xác nhận" | Xác nhận → Đã đóng gói → Giao (GHN, để trống mã) → thêm sự kiện "Giao thành công" | — | Trạng thái đi đúng thứ tự; mã vận đơn tự sinh `FM-…`; đơn khách "Hoàn tất", COD "Đã thanh toán" | ✅ | ✅ | ❌ | ❌ | `sellerFlow_andLogisticsDelivery_completeCodOrder`, `follows the seller state machine` |
| BR-ORD-02 | H | P1 | — | Danh sách đơn, chuyển 7 tab | Tất cả / Chờ xác nhận / … / Đã hủy | Lọc đúng | ❌ | ✅ | ❌ | ✅ | |
| BR-ORD-03 | H | P1 | — | Chi tiết đơn | — | Địa chỉ, thanh toán, ghi chú khách; Tạm tính, Phí nền tảng (10%), Thực nhận | ✅ | — | ❌ | ✅ | |
| BR-ORD-04 | E | P1 | Đơn cha PayOS chưa trả | Bấm "Xác nhận đơn" | — | Bị từ chối "Không thể chuyển sang trạng thái này" | ❌ | — | — | ❌ | |
| BR-ORD-05 | E | P1 | Đơn "Chờ xác nhận" | Gọi `/ship` (bỏ qua bước) | — | `INVALID_STATUS_TRANSITION` | ❌ | ✅ | — | ❌ | |
| BR-ORD-06 | H | P1 | Đơn "Đã xác nhận" | Huỷ, nhập lý do | `Hết hàng` | "Đã hủy"; hoàn kho; đơn 1 shop thì đơn cha huỷ | ❌ | — | ❌ | ❌ | |
| BR-ORD-07 | E | P2 | — | Huỷ không nhập lý do (UI) | — | "Vui lòng nhập lý do"; tối đa 200 ký tự | — | ❌ | ❌ | ❌ | |
| BR-ORD-08 | E | P1 | Đơn "Đang giao" | Huỷ | — | Bị từ chối | ❌ | ✅ | — | ❌ | |
| BR-ORD-09 | W | P0 | Đơn đã thanh toán gồm 2 shop | Shop A huỷ phần mình | — | Ghi nhận số tiền cần hoàn cho phần bị huỷ; shop B tiếp tục | ✅ | — | — | ❌ | `sellerCancelOnPaidMultiSellerOrder…` |
| BR-ORD-10 | W | P0 | Brand A | Xem / thao tác đơn của brand B | — | 403 "Không có quyền truy cập đơn seller" | ✅ | — | — | ❌ | `sellerDetail_containsOnlyOwnSellerOrder…` |
| BR-ORD-11 | E | P2 | — | Đơn vị vận chuyển lạ / mã vận đơn trùng / > 100 ký tự | `DHL` | "Đơn vị vận chuyển không hợp lệ" / "Mã vận đơn đã tồn tại" | ❌ | — | — | ❌ | |
| BR-ORD-12 | E | P2 | Đã "Giao thành công" | Thêm sự kiện khác | — | Bị từ chối | ❌ | — | — | ❌ | |
| BR-ORD-13 | E | P2 | Đang giao | Thêm sự kiện "Giao thất bại" / "Đã hoàn hàng" | — | Ghi nhận; ghi chú: đơn seller không đổi trạng thái | ❌ | — | — | ❌ | Luồng hoàn hàng chưa có |
| BR-ORD-14 | W | P1 | — | Webhook vận chuyển với `X-Logistics-Token` sai / mặc định `dev-logistics-token` trên prod | — | Sai token bị từ chối; prod **không** dùng token mặc định | ❌ | — | — | ❌ | Kiểm tra biến môi trường prod |
| BR-ORD-15 | E | P2 | — | Lọc với status lạ | `?status=ABC` | Danh sách trống, không lỗi | ❌ | — | — | ❌ | |

## 10.4 Đối soát & tài khoản nhận tiền (BR-STL)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-STL-01 | H | P1 | Có đơn giao > 7 ngày | `/brand/settlements` | — | Thẻ "Đang giữ", "Chờ đối soát", "Đã thanh toán"; danh sách kỳ đối soát | ✅ | ✅ | ❌ | ✅ | `SettlementIntegrationTest` |
| BR-STL-02 | E | P1 | Đơn giao 6 ngày | Admin tạo kỳ đối soát | — | Đơn chưa được đưa vào kỳ | ✅ | — | — | ❌ | |
| BR-STL-03 | H | P1 | — | Cập nhật tài khoản nhận tiền | Ngân hàng, số TK, chủ TK | Lưu được | ❌ | — | ❌ | ❌ | Giới hạn 255 / 100 / 255 ký tự |
| BR-STL-04 | E | P2 | — | Số tài khoản 101 ký tự | — | Báo lỗi độ dài | ❌ | — | — | ❌ | |
| BR-STL-05 | W | P1 | Brand chưa được duyệt / tạm ngưng | Mở đối soát, sửa tài khoản nhận tiền | — | Bị chặn | ❌ | — | — | ❌ | Hiện không kiểm tra trạng thái brand |

## 10.5 Dashboard & phân tích (BR-ANA)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-ANA-01 | H | P1 | Brand có dữ liệu | `/brand/dashboard` | — | Tổng sản phẩm, đang hoạt động, click mua, CTR, lượt thử AI, Try-on → Mua, AI gợi ý; mục "Bán hàng (30 ngày)" | ✅ | — | ✅ | ✅ | `brandDashboard_aggregatesEventsWithoutPii` |
| BR-ANA-02 | W | P1 | 10 click, 2 lượt xem | Xem CTR | — | CTR tối đa 100% | ✅ | ✅ | — | ✅ | `clickThroughRateNeverExceedsOneHundredPercent`; lỗi 350% đã sửa |
| BR-ANA-03 | E | P2 | Brand mới, chưa có dữ liệu | Xem dashboard | — | Các chỉ số = 0 hoặc "—", không lỗi chia 0 | ❌ | ❌ | ❌ | ❌ | |
| BR-ANA-04 | H | P2 | — | Lượt thử AI | — | Đếm số lượt thử khác nhau có sản phẩm của brand | ✅ | — | — | ❌ | `brandTryOnStats_countDistinctRequests…` |
| BR-ANA-05 | H | P2 | — | `/brand/analytics` và 4 trang con (chuyển hướng / rời bỏ / do dự / thử mặc) | — | Mỗi trang có số liệu riêng phù hợp tiêu đề | ❌ | — | ❌ | ✅ | Ghi nhận: 4 API trả cùng một payload |
| BR-ANA-06 | H | P2 | — | `/brand/insights/demand` | — | Outfit like / dislike, click, xác nhận mua; tỉ lệ "—" khi mẫu số 0 | ❌ | — | ❌ | ✅ | |
| BR-ANA-07 | W | P1 | — | Kiểm tra dữ liệu trả về | — | Không chứa email / tên / SĐT người mua | ✅ | — | — | ❌ | |
| BR-ANA-08 | H | P2 | — | Doanh thu 30 ngày | — | Không tính đơn đã huỷ; đã giao / đã huỷ là số toàn thời gian | ❌ | — | — | ❌ | |

## 10.6 Cài đặt brand (BR-SET)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-SET-01 | H | P1 | — | `/brand/settings` → "Chỉnh sửa" → đổi mô tả, website → "Lưu" | — | Lưu; trang brand công khai hiển thị thông tin mới | ❌ | — | ❌ | ❌ | Prod chỉ mở trang |
| BR-SET-02 | H | P1 | — | Đổi logo | PNG 500 KB | Logo lưu ngay (trước khi bấm Lưu); logo cũ bị xoá | ❌ | — | ❌ | ❌ | |
| BR-SET-03 | W | P1 | Brand đã có link TikTok / Instagram / Facebook | Sửa mô tả rồi lưu | — | Các link mạng xã hội giữ nguyên | ✅ | — | ❌ | ✅ | Đã sửa #21 (`d88f285`). Trước đây: Form không gửi các trường này → bị xoá thành rỗng |
| BR-SET-04 | E | P2 | — | Xoá tên brand rồi lưu | — | Báo bắt buộc | ❌ | ❌ | ❌ | ❌ | FE không kiểm tra, BE chặn |
| BR-SET-05 | E | P2 | — | Email / website sai định dạng | — | Báo lỗi | ❌ | ❌ | ❌ | ❌ | Không có kiểm tra |
| BR-SET-06 | H | P1 | — | Đổi mật khẩu trong thẻ "Đổi mật khẩu" | — | Như AUTH-CHP-01 | ✅ | — | ❌ | ❌ | |
