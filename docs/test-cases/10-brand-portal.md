# 10 · Cổng thương hiệu — Brand portal (BR)

[← Mục lục](../TEST_CASES.md)

Đơn hàng seller (BR-ORD-01..15), đối soát & tài khoản nhận tiền (BR-STL-01..05) và doanh thu 30 ngày (BR-ANA-08) đã xoá vì thương mại in-app bị gỡ ở V27 (`7ae8d1d`): brand tự bán trên website / sàn của mình, FitMe chỉ chuyển khách sang. Logic gói Brand Plus, voucher, khách quan tâm và chỉ số khách thử đồ nằm ở [06-brand-plus-voucher-lead.md](06-brand-plus-voucher-lead.md); file này giữ các case giao diện portal.

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Đăng ký brand | Chỉ tài khoản USER; FE: tên ≥ 2 ký tự, email hợp lệ, website là URL hoặc rỗng; BE: chỉ bắt buộc tên. Trạng thái Chờ duyệt / Đã duyệt / Từ chối / Tạm ngưng. Bị từ chối thì gửi lại được. Duyệt → role BRAND_OWNER (phải đăng nhập lại) |
| Menu | Tổng quan, Sản phẩm, Khách quan tâm, Nhu cầu Gen Z, Phân tích, Gói Plus, Cài đặt |
| Brand chưa duyệt / tạm ngưng | Mọi API portal (sản phẩm, dashboard, phân tích, Gói Plus, voucher, khách quan tâm) báo "Brand chưa được duyệt. Trạng thái: X" (`BRAND_NOT_APPROVED`) hoặc "Brand đã bị tạm ngưng. Vui lòng liên hệ FitMe để được hỗ trợ." (`BRAND_SUSPENDED`) |
| Sản phẩm | Tạo → Bản nháp; "Gửi duyệt" → Chờ duyệt (**từ bất kỳ trạng thái nào**); admin duyệt → Đang hiển thị (chặn khi thiếu ảnh hoặc thiếu link mua hợp lệ); Ẩn → Tạm ẩn; chỉ xoá vĩnh viễn được sản phẩm Tạm ẩn |
| Sửa sản phẩm | Không đổi trạng thái (sản phẩm đang hiển thị không cần duyệt lại); giữ ID biến thể. Biến thể chỉ còn màu / size, không còn tồn kho (cột `stock_quantity` bỏ ở V27) |
| Kiểm tra form | FE: ≥ 1 ảnh, giá 1.000 – 1.000.000.000đ, "Link mua hàng" bắt buộc. BE: tên, danh mục, giá; link mua `@NotBlank` "Link mua hàng không được để trống", ≤ 2048 ký tự, phải là `https://…` tới trang sản phẩm, nếu sai: "Link mua hàng không hợp lệ, cần dạng https://... tới trang sản phẩm của cửa hàng" (`INVALID_PURCHASE_URL`) |
| Gói Plus | Trang `/brand/plan` và `/brand/plan/return`; giá, giảm giá, voucher, gia hạn xem module 06 (BP, BV) |
| Khách quan tâm | Trang `/brand/leads`; brand không Plus chỉ thấy số liệu tổng và lời mời nâng cấp (module 06, LEAD) |
| Chỉ số | CTR = min(1, click mua ÷ lượt xem); Try-on → Mua = min(1, click mua ÷ lượt thử có sản phẩm brand); khách thử đồ 7 / 30 ngày đếm không trùng (module 06, CUS) |

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
| BR-APP-12 | W | P1 | Brand bị tạm ngưng | Đăng nhập và mở portal | — | Bị chặn toàn bộ portal (kể cả Gói Plus, khách quan tâm) | ✅ | — | ❌ | ❌ | Đã sửa #3 (`8153a83`). Trước đây: Brand tạm ngưng vẫn giữ role, vẫn xử lý đơn và đối soát được |
| BR-APP-13 | W | P2 | — | Mô tả / tên chứa HTML | — | Hiển thị như văn bản ở trang brand công khai và admin | ❌ | ❌ | ❌ | ❌ | |

## 10.2 Quản lý sản phẩm (BR-PRD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-PRD-01 | H | P0 | Brand đã duyệt | `/brand/products/new` → điền đủ → lưu | Tên `Áo QA`, Áo, 299000, màu `Đen, Trắng`, size `S, M, L`, 2 ảnh, link mua `https://shopee.vn/x` | Tạo "Bản nháp"; 6 biến thể (2 màu × 3 size); ảnh đầu là ảnh chính | ✅ | ✅ | ✅ | ❌ | `createProduct_withVariantsAndImages`, `product-mapper.test`; brand-full.spec |
| BR-PRD-02 | H | P0 | Có bản nháp | Bấm "Gửi duyệt" | — | "Chờ duyệt"; admin thấy trong hàng chờ | ✅ | — | ✅ | ❌ | `createAndSubmitReview_asBrandOwner`; role-flows |
| BR-PRD-03 | E | P1 | — | Lưu khi chưa có ảnh | — | "Cần ít nhất 1 ảnh sản phẩm" | — | ❌ | ❌ | ❌ | |
| BR-PRD-04 | E | P1 | — | Giá âm / 0 | `-1000`, `0` | Bị từ chối với thông báo giá hợp lệ | ✅ | ✅ | ❌ | ✅ | Đã sửa #11 (`8153a83`). Trước đây: FE và BE đều chấp nhận giá âm |
| BR-PRD-05 | E | P0 | — | Link mua bỏ trống / `abc` / `javascript:alert(1)` khi tạo hoặc sửa | — | "Link mua hàng không được để trống" / "Link mua hàng không hợp lệ, cần dạng https://... tới trang sản phẩm của cửa hàng"; vẫn ở trang tạo | ✅ | ✅ | ✅ | ✅ | Đã sửa #22 (`d88f285`), bắt buộc từ V27. BE `brandCannotSaveProductWithoutPurchaseUrl`, `brandCannotSaveMalformedPurchaseUrl`, `updateProduct_requiresValidPurchaseUrl`; `validators.test`; brand-full "product form requires a valid purchase link". PROD kiểm tra link sai (chưa kiểm tra bỏ trống) |
| BR-PRD-06 | E | P2 | — | Bỏ trống màu và size | — | Tạo 1 biến thể mặc định Đen / M | — | ✅ | ❌ | ❌ | |
| BR-PRD-07 | E | P2 | — | Tên 1.000 ký tự | — | Báo lỗi độ dài | ❌ | ❌ | — | ❌ | Không có giới hạn |
| BR-PRD-08 | H | P1 | — | Upload ảnh JPG / PNG / WEBP nhiều file | — | Ảnh hiển thị; gợi ý "JPG, PNG, WEBP — tối đa 5MB" | ❌ | ✅ | ❌ | ❌ | |
| BR-PRD-09 | E | P2 | — | Upload ảnh > 5 MB / GIF | — | "Ảnh tối đa 5MB." / "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP." | ❌ | ✅ | ❌ | ❌ | |
| BR-PRD-10 | W | P2 | Brand A và B upload ảnh cùng tên | — | — | Ảnh không ghi đè lẫn nhau | ❌ | — | — | ❌ | Tên file có tiền tố brandId; cùng brand cùng tên thì ghi đè |
| BR-PRD-11 | H | P1 | Sản phẩm đang hiển thị, đã có click mua / lead | Sửa mô tả rồi lưu | — | Lưu được; sản phẩm vẫn hiển thị; ID biến thể giữ nguyên | ✅ | — | ✅ | ❌ | Đã sửa #8 (`8153a83`). Trước đây: Sửa làm tồn kho về 100 và đổi ID biến thể. BE `updateProduct_keepsVariantIds` |
| BR-PRD-12 | E | P1 | Sản phẩm đang hiển thị | Sửa giá / ảnh / link mua | — | Ghi nhận: thay đổi lên ngay, không cần admin duyệt lại | ❌ | — | ❌ | ❌ | Rủi ro nội dung; link mua mới vẫn phải hợp lệ |
| BR-PRD-13 | E | P2 | Sản phẩm đang hiển thị | Bấm "Gửi duyệt" | — | Không cho gửi duyệt lại sản phẩm đã duyệt (hoặc ghi rõ hành vi) | ❌ | — | ❌ | ❌ | Hiện chuyển về "Chờ duyệt" → biến mất khỏi cửa hàng |
| BR-PRD-14 | H | P1 | — | Bấm "Ẩn" → xác nhận | — | "Tạm ẩn"; biến mất khỏi `/discover` | ❌ | — | ❌ | ❌ | |
| BR-PRD-15 | E | P2 | Đã ẩn | Ẩn lần nữa (API) | — | "Sản phẩm đã được ẩn" | ❌ | — | — | ❌ | |
| BR-PRD-16 | H | P1 | Sản phẩm Tạm ẩn | Bấm "Xóa" → xác nhận | — | Xoá vĩnh viễn | ❌ | — | ❌ | ❌ | |
| BR-PRD-17 | E | P1 | Sản phẩm đang hiển thị | Xoá (API) | — | "Chỉ có thể xóa vĩnh viễn sản phẩm đã ẩn (Tạm ẩn)" | ❌ | — | — | ❌ | |
| BR-PRD-18 | W | P1 | Sản phẩm Tạm ẩn đã có click mua, lead, đánh giá | Xoá vĩnh viễn | — | Tủ chi tiêu của khách và danh sách khách quan tâm của brand vẫn mở được, không lỗi | ❌ | — | — | ❌ | |
| BR-PRD-19 | H | P2 | — | Danh sách sản phẩm | — | Bản nháp và chờ duyệt lên trước; nhãn trạng thái tiếng Việt | — | ✅ | ✅ | ✅ | `sort-brand-products.test`, `status-labels.test` |
| BR-PRD-20 | W | P0 | Brand A | Sửa / ẩn / xoá / gửi duyệt sản phẩm của brand B (API) | — | Bị từ chối | ✅ | — | — | ❌ | Hiện trả 400 "Sản phẩm không thuộc brand của bạn" (nên là 403); BE `P0PortalIntegrationTest#brandCannotReadEditHideDeleteOrSubmitAnotherBrandsProduct` |
| BR-PRD-21 | W | P1 | Brand A | Xem phân tích sản phẩm của brand B | — | Bị từ chối | ✅ | — | — | ✅ | Đã sửa #2 (`8153a83`). Trước đây: Không kiểm tra sở hữu; lộ số lượt thử của brand B |
| BR-PRD-22 | H | P2 | — | `/brand/products/{id}/analytics` | — | Lượt click, hoàn cảnh, size, màu có dữ liệu | ✅ | — | ✅ | ✅ | Đã sửa #23 (`d88f285`). Trước đây: Backend không trả hoàn cảnh / size / màu → 3/4 biểu đồ luôn trống |
| BR-PRD-23 | W | P2 | — | Khách / user thường gọi API sản phẩm brand | — | 403 | ✅ | — | — | ❌ | `createProduct_withoutAuth_returnsForbidden` |

## 10.3 Gói Plus trên portal (BR-PLN)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-PLN-01 | H | P1 | Brand đã duyệt | Menu "Gói Plus" | — | Tiêu đề "Gói Plus"; mô tả "Niêm yết sản phẩm trên FitMe luôn miễn phí. FitMe Brand Plus giúp brand bán được nhiều hơn."; thẻ "Quyền lợi": ưu tiên trong gợi ý phối đồ, khách thử đồ AI miễn phí, xem khách có nhu cầu mua (lead) | — | — | ✅ | ❌ | brand-full / portal paths (chỉ kiểm tra tiêu đề) |
| BR-PLN-02 | H | P1 | Đang có Plus | Mở trang | — | "Đang hoạt động đến dd/MM/yyyy"; nút "Gia hạn" kèm giải thích cộng thêm số ngày từ ngày hết hạn hiện tại | ❌ | — | ❌ | ❌ | Logic xem BP-REN-01 |
| BR-PLN-03 | H | P1 | Có 2 voucher dùng được (30%, 50%) | Mở khối "Chọn voucher" | — | "Không dùng voucher" + 2 voucher, 50% đứng trước; chọn voucher thì "Giá niêm yết", "Thành tiền", "Giảm 50% · Voucher FITME-…" cập nhật | ✅ | ✅ | ❌ | ❌ | `quoteAppliesTheLargerOfTheRunningDiscountAndTheVoucher`; "keeps usable vouchers, biggest discount first then soonest expiry" |
| BR-PLN-04 | E | P2 | Chưa có voucher | Mở trang | — | "Bạn chưa có voucher nào dùng được. FitMe sẽ gửi voucher cho brand trong các chương trình ưu đãi." | — | ❌ | ❌ | ❌ | |
| BR-PLN-05 | H | P2 | Có voucher ở nhiều trạng thái | Xem "Voucher của bạn" | — | Nhãn "Chưa dùng", "Đang giữ cho đơn chờ thanh toán" ("Đang giữ cho đơn #…"), "Đã dùng" ("Đã dùng ngày …"), "Đã thu hồi", "Hết hạn"; hạn "HSD dd/MM/yyyy" hoặc "Không thời hạn" | — | ✅ | ❌ | ❌ | "maps statuses to Vietnamese labels and badge variants" |
| BR-PLN-06 | E | P1 | Chương trình giảm 60%, chọn voucher 50% | Xem báo giá | — | Hiện lý do voucher không được dùng; dòng "Mỗi lần mua dùng tối đa một voucher. Voucher không cộng dồn với chương trình giảm giá đang chạy…" | ✅ | ✅ | ❌ | ❌ | `biggerRunningDiscountWinsAndTheVoucherStaysIssued`; "labels the running discount and the no-discount case" |
| BR-PLN-07 | E | P2 | Voucher vừa bị giữ ở tab khác | Chọn voucher đó | — | "Voucher đang được giữ cho một đơn thanh toán chưa hoàn tất…" hoặc "Không tính được giá với voucher này" | ❌ | ❌ | ❌ | ❌ | |
| BR-PLN-08 | E | P1 | PayOS lỗi | Bấm "Thanh toán" | — | Toast "Không thể tạo thanh toán"; nút trở lại bình thường, không tạo đơn treo | ❌ | ❌ | ❌ | ❌ | |
| BR-PLN-09 | H | P2 | Có đơn chờ | Bấm "Hủy đơn" | — | Toast "Đã hủy đơn chờ thanh toán"; voucher đang giữ trở lại danh sách chọn | ❌ | ❌ | ❌ | ❌ | Logic xem BP-BUY-12 |

## 10.4 Khách quan tâm trên portal (BR-LEAD)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-LEAD-01 | H | P1 | Brand Plus có lead | Menu "Khách quan tâm" | — | Thẻ "Tổng khách quan tâm", "30 ngày qua", "Đã bán"; bảng Tên, email, Sản phẩm, Size / màu, Thời gian, Đã bán; "Trang x / y · n khách" | ✅ | — | ✅ | ❌ | `plusLeadListFiltersAndPaginates`; portal paths (chỉ kiểm tra tiêu đề) |
| BR-LEAD-02 | H | P1 | Brand không có Plus | Mở `/brand/leads` | — | Chỉ có 3 thẻ số liệu và khối "Xem chi tiết khách quan tâm với Brand Plus" + nút "Nâng cấp Brand Plus" → `/brand/plan` | ✅ | ❌ | ❌ | ❌ | `plusBrandSeesCustomerDetails_nonPlusBrandOnlyCounts` |
| BR-LEAD-03 | H | P2 | Brand Plus | Lọc "Từ ngày", "Đến ngày", "Sản phẩm", "Trạng thái" (Tất cả / Đã bán / Chưa bán); "Xóa bộ lọc" | — | Danh sách cập nhật; không có kết quả thì "Chưa có khách quan tâm nào khớp bộ lọc." | ✅ | ✅ | ❌ | ❌ | "only sends the filters that are set" |
| BR-LEAD-04 | H | P1 | Brand Plus | Tích ô "Đã bán" của 1 dòng; mô phỏng lỗi mạng | — | Cập nhật ngay, thẻ "Đã bán" +1; lỗi thì hoàn lại và toast "Không cập nhật được trạng thái đã bán" | ✅ | ✅ | ❌ | ❌ | `soldLeadGivesTheCustomersReviewTheVerifiedBadge_andUnmarkingReverts`; "toggles one row and keeps the sold count in step" |
| BR-LEAD-05 | E | P2 | Lead của khách đã rút đồng ý / xoá tài khoản / không có tên | Xem bảng | — | "Khách đã rút đồng ý" / "Khách đã xóa tài khoản" (không có email); thiếu tên thì "Khách hàng FitMe" | ✅ | ✅ | — | ❌ | "shows name and email only while the customer still consents" |

## 10.5 Dashboard & phân tích (BR-ANA)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-ANA-01 | H | P1 | Brand có dữ liệu | `/brand/dashboard` | — | Tổng sản phẩm, Đang hoạt động, Lượt click mua, CTR, Lượt thử AI, Try-on → Mua, AI gợi ý, Khách thử đồ 7 ngày, Khách thử đồ 30 ngày; **không** còn mục "Bán hàng (30 ngày)" | ✅ | — | ✅ | ❌ | `brandDashboard_aggregatesEventsWithoutPii`; brand-full "dashboard is open without billing gate". PROD 04/10 kiểm tra bản có mục bán hàng |
| BR-ANA-02 | W | P1 | 10 click, 2 lượt xem | Xem CTR | — | CTR tối đa 100% | ✅ | ✅ | — | ✅ | `clickThroughRateNeverExceedsOneHundredPercent`; lỗi 350% đã sửa |
| BR-ANA-03 | E | P2 | Brand mới, chưa có dữ liệu | Xem dashboard | — | Các chỉ số = 0 hoặc "—", không lỗi chia 0; phễu và top sản phẩm hiện trạng thái trống | ❌ | ❌ | ❌ | ❌ | |
| BR-ANA-04 | H | P2 | — | Lượt thử AI | — | Đếm số lượt thử khác nhau có sản phẩm của brand | ✅ | — | — | ❌ | `brandTryOnStats_countDistinctRequests…` |
| BR-ANA-05 | H | P2 | — | `/brand/analytics` và 4 trang con (chuyển hướng / rời bỏ / do dự / thử mặc) | — | Mỗi trang có số liệu riêng phù hợp tiêu đề | ❌ | — | ❌ | ✅ | Ghi nhận: 4 API trả cùng một payload |
| BR-ANA-06 | H | P2 | — | `/brand/insights/demand` | — | Outfit like / dislike, click, xác nhận mua; tỉ lệ "—" khi mẫu số 0 | ❌ | — | ❌ | ✅ | |
| BR-ANA-07 | W | P1 | — | Kiểm tra dữ liệu dashboard / phân tích trả về | — | Không chứa email / tên / SĐT khách (tên, email chỉ có ở trang Khách quan tâm khi khách đồng ý) | ✅ | — | — | ❌ | |
| BR-ANA-09 | H | P2 | Có khách thử đồ, bấm mua, lead đã bán | Xem "Phễu khách hàng 30 ngày" và "Sản phẩm được thử nhiều nhất (30 ngày)" | — | Phễu 3 bước kèm % so với bước trước; bảng Sản phẩm / Khách thử đồ tối đa 10 dòng | ✅ | ✅ | ❌ | ❌ | Logic xem CUS-03, CUS-04; "rates each step against the previous one" |

## 10.6 Cài đặt brand (BR-SET)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-SET-01 | H | P1 | — | `/brand/settings` → "Chỉnh sửa" → đổi mô tả, website → "Lưu" | — | Lưu; trang brand công khai hiển thị thông tin mới | ❌ | — | ❌ | ❌ | Prod chỉ mở trang |
| BR-SET-02 | H | P1 | — | Đổi logo | PNG 500 KB | Logo lưu ngay (trước khi bấm Lưu); logo cũ bị xoá | ❌ | — | ❌ | ❌ | |
| BR-SET-03 | W | P1 | Brand đã có link TikTok / Instagram / Facebook | Sửa mô tả rồi lưu | — | Các link mạng xã hội giữ nguyên | ✅ | — | ❌ | ✅ | Đã sửa #21 (`d88f285`). Trước đây: Form không gửi các trường này → bị xoá thành rỗng |
| BR-SET-04 | E | P2 | — | Xoá tên brand rồi lưu | — | Báo bắt buộc | ❌ | ❌ | ❌ | ❌ | FE không kiểm tra, BE chặn |
| BR-SET-05 | E | P2 | — | Email / website sai định dạng | — | Báo lỗi | ❌ | ❌ | ❌ | ❌ | Không có kiểm tra |
| BR-SET-06 | H | P1 | — | Đổi mật khẩu trong thẻ "Đổi mật khẩu" | — | Như AUTH-CHP-01 | ✅ | — | ❌ | ❌ | |
