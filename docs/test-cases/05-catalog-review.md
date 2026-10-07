# 05 · Danh mục sản phẩm & đánh giá (CAT / REV)

[← Mục lục](../TEST_CASES.md)

CAT-PDP-02..05 (chọn biến thể, tồn kho) và CAT-PDP-09..11 (giỏ hàng, "Mua ngay") đã xoá vì thương mại in-app bị gỡ ở V27 (`7ae8d1d`): trang chi tiết không còn chọn biến thể, không còn tồn kho, không còn giỏ.

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Hiển thị công khai | Chỉ sản phẩm `ACTIVE` của brand `APPROVED`; còn lại trả 404 "Sản phẩm không tồn tại" / "Sản phẩm không khả dụng" |
| Bộ lọc API | `brandId`, `category`, `priceMin`, `priceMax` (bao gồm biên, sản phẩm không có giá luôn qua), `style`, `occasion`, `color`, `fitType`, `sizeLabel` / `size` (giá trị 10, 20, 25, 50, 100, 200 bị bỏ qua vì giống page size), `search` (tên, mô tả, danh mục, tên brand; không phân biệt hoa thường), `aiTryOnEligible`. **Không có phân trang, không có sắp xếp** |
| Nhóm danh mục | Áo, Quần, Váy, Áo khoác, Giày, Phụ kiện. Trang khám phá lọc nhóm ở phía client |
| Biến thể | Giá nằm ở sản phẩm; biến thể chỉ có màu, size (không còn tồn kho từ V27). Trang chi tiết hiện màu và size dạng nhãn, không chọn biến thể. Thứ tự size XXS → XS → S → M → L → XL → XXL… → Free size, rồi size số tăng dần |
| Mua hàng | Chỉ qua cửa hàng gốc của brand: nút "Mua tại cửa hàng gốc" mở `/redirect/confirm/{id}`; trang chi tiết chỉ có thêm "Tư vấn size & phối đồ bằng AI" và "Thử mặc bằng AI". Sản phẩm không có link mua thì không có nút mua |
| Lượt xem | Đếm 1 lần / người xem / 30 phút; sản phẩm không ACTIVE không được đếm |
| Đánh giá | 1–5 sao; nội dung bắt buộc ≤ 2000 ký tự (FE yêu cầu ≥ 20 ký tự); ≤ 5 ảnh do chính người viết upload; **1 đánh giá / sản phẩm / người**; **không bắt buộc đã mua**; nhãn "Đã mua hàng" khi người viết đã bấm mua qua FitMe rồi tự xác nhận đã mua, hoặc brand Plus tích "Đã bán" cho lead của người đó |
| Thưởng đánh giá | +2 Fitken khi có ≥ 1 ảnh **và** ≥ 20 ký tự; tối đa 1 lần thưởng / ngày (giờ Việt Nam) |
| Hữu ích | 1 lượt / người; tác giả không tự bình chọn; chỉ cho đánh giá đang hiển thị |
| Admin | Ẩn đánh giá (tuỳ chọn thu hồi thưởng); không có chức năng hiện lại |

---

## 5.1 Khám phá & tìm kiếm (CAT-DIS)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CAT-DIS-01 | H | P0 | — | Mở `/discover` | — | Sản phẩm nhóm theo brand, lướt ngang; có ảnh, tên, giá VND | ✅ | — | ✅ | ✅ | `listProducts_returnsActiveItems`; 36 sản phẩm trên prod |
| CAT-DIS-02 | H | P1 | — | Tìm theo tên sản phẩm | `sơ mi` | Chỉ sản phẩm chứa từ khoá | ✅ | ✅ | ✅ | ✅ | `searchByProductName…` |
| CAT-DIS-03 | H | P1 | — | Tìm theo tên brand, khác hoa thường | `LOCAL BRAND` | Sản phẩm của brand đó | ✅ | ✅ | ✅ | ✅ | `searchByBrandName…` |
| CAT-DIS-04 | E | P1 | — | Tìm từ khoá không có kết quả | `xyzxyz` | Trạng thái trống có hướng dẫn, không lỗi | ❌ | ❌ | ❌ | ❌ | |
| CAT-DIS-05 | E | P2 | — | Tìm có dấu / không dấu | `ao thun` vs `áo thun` | Ghi nhận: tìm không dấu có ra kết quả có dấu không | ❌ | ❌ | ❌ | ❌ | Hiện là so khớp chuỗi thường |
| CAT-DIS-06 | W | P0 | — | Tìm chuỗi SQL injection | `' OR 1=1 --`, `%`, `_` | Không lỗi 500, không trả toàn bộ dữ liệu bất thường | ✅ | — | ❌ | ❌ | BE `P0SecurityIntegrationTest#catalogSearchAndFilters_treatSqlAndWildcardsAsPlainText` |
| CAT-DIS-07 | W | P2 | — | Tìm chuỗi rất dài | 5.000 ký tự | Không lỗi, trả rỗng | ❌ | — | — | ❌ | |
| CAT-DIS-08 | H | P1 | — | Lọc nhóm "Áo khoác" | — | Chỉ sản phẩm thuộc nhóm Áo khoác (không lẫn Áo) | ✅ | ✅ | ✅ | ❌ | `ProductCategoryGroupsTest`, `product-category.test` |
| CAT-DIS-09 | H | P1 | — | Lọc theo brand | — | Chỉ sản phẩm của brand đó | ❌ | — | ❌ | ❌ | |
| CAT-DIS-10 | H | P1 | — | Lọc giá 200.000–400.000 | — | Chỉ sản phẩm trong khoảng, bao gồm biên | ❌ | — | ❌ | ❌ | |
| CAT-DIS-11 | E | P2 | — | Lọc giá min > max | `priceMin=500000&priceMax=100000` | Danh sách trống, không lỗi | ❌ | — | — | ❌ | |
| CAT-DIS-12 | E | P2 | — | Lọc giá âm / chữ | `priceMin=-1`, `priceMin=abc` | 400 hoặc bỏ qua, không 500 | ❌ | — | — | ❌ | |
| CAT-DIS-13 | E | P2 | — | `GET /products?size=M` và `size=20` | — | `M`: lọc theo size; `20`: bị bỏ qua (giống page size) | ❌ | — | — | ✅ | |
| CAT-DIS-14 | H | P2 | — | Bấm "Thử AI" ở trang khám phá | — | Chỉ sản phẩm đủ điều kiện thử AI | ❌ | — | ❌ | ❌ | |
| CAT-DIS-15 | H | P2 | Mobile | Mở hộp lọc | — | Dialog lọc mở được, áp dụng được | — | — | ✅ | ❌ | mobile-nav.spec (CI) |
| CAT-DIS-16 | H | P2 | — | Bấm icon "Tìm kiếm nhanh" trên header | — | Cuộn lên đầu `/discover`, focus ô tìm | — | ✅ | ✅ | ✅ | `discover-search.test`; navigation.spec |
| CAT-DIS-17 | E | P1 | Brand bị tạm ngưng | Mở `/discover` | — | Sản phẩm của brand đó không hiển thị | ❌ | — | ❌ | ❌ | |
| CAT-DIS-18 | W | P2 | 1.000 sản phẩm trong DB | Mở `/discover` | — | Thời gian tải chấp nhận được (< 3 giây) | ❌ | — | — | ❌ | Không có phân trang → rủi ro hiệu năng |
| CAT-DIS-19 | H | P2 | — | Mở `/discover/brand/{id}` | — | Thông tin brand + sản phẩm của brand | ❌ | — | — | ✅ | |

## 5.2 Chi tiết sản phẩm (CAT-PDP)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CAT-PDP-01 | H | P0 | — | Mở `/products/{id}` | — | Ảnh, tên, giá, màu, size theo thứ tự S → XL, bảng size, mô tả, đánh giá | ✅ | ✅ | ✅ | ✅ | `getProductById_returnsDetail`; lỗi thứ tự size đã sửa ở `ee9d956` |
| CAT-PDP-06 | E | P1 | — | Mở ID không tồn tại / UUID sai định dạng | `/products/abc` | Trang 404 thân thiện | ❌ | — | ❌ | ❌ | Không có `not-found.tsx` riêng; dùng trang mặc định Next |
| CAT-PDP-07 | E | P1 | Sản phẩm DRAFT / PENDING_REVIEW / INACTIVE | Mở bằng URL trực tiếp | — | Không hiển thị (404) | ✅ | — | ❌ | ❌ | `productView_ignoresUnpublishedProducts` |
| CAT-PDP-08 | H | P2 | — | Xem bảng size | — | Cột Size, Ngực, Eo, Hông, Cao, Cân; ô thiếu hiện "—" | ✅ | ❌ | ❌ | ✅ | `seededSizeChartsAreGraduated…` |
| CAT-PDP-12 | H | P0 | Sản phẩm có link mua | Bấm "Mua tại cửa hàng gốc" | — | Mở `/redirect/confirm/{id}`; trang không có nút "Thêm vào giỏ" / "Mua ngay" | ✅ | — | ✅ | ❌ | redirect-flow.spec (chưa kiểm tra việc không còn nút giỏ); xem 08-wardrobe-gallery-redirect. Nâng P0 vì là đường mua duy nhất |
| CAT-PDP-13 | H | P2 | — | Bấm "Tư vấn size & phối đồ bằng AI" / "Thử mặc bằng AI" | — | Vào chat với sản phẩm / `/try-on?product={id}` | — | — | ✅ | ❌ | |
| CAT-PDP-14 | H | P2 | — | Mở trang 2 lần trong 30 phút | — | Lượt xem chỉ tăng 1 | ✅ | — | — | ❌ | `productViews_areDedupedPerViewer…` |
| CAT-PDP-15 | W | P2 | Ảnh sản phẩm lỗi | Mở trang | — | Hiển thị ảnh placeholder | — | ✅ | — | ❌ | `media-url.test` |
| CAT-PDP-16 | H | P2 | — | `GET /products/{id}/similar` | — | ≤ 8 sản phẩm cùng nhóm, không gồm chính nó | ❌ | — | — | ✅ | Không có trang FE gọi API này |
| CAT-PDP-17 | H | P2 | — | Chia sẻ link sản phẩm (mở ở trình duyệt khác) | — | Trang tải đúng, có ảnh OpenGraph | — | — | ❌ | ❌ | |
| CAT-PDP-18 | H | P1 | Sản phẩm có nhiều màu, size | Mở trang | — | Màu và size hiển thị dạng nhãn (không chọn được, không có thông báo tồn kho); brand Plus có badge "Brand Plus" cạnh tên brand | — | ❌ | ❌ | ❌ | Badge xem PLUS-19 |

## 5.3 Đánh giá sản phẩm (REV)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| REV-01 | H | P1 | Sản phẩm có đánh giá | Xem phần đánh giá | — | Điểm trung bình (1 chữ số thập phân), số đánh giá, 5 đánh giá / trang, "Trang X / Y" | ✅ | — | ❌ | ✅ | |
| REV-02 | H | P0 | Đã đăng nhập, chưa đánh giá sản phẩm này, chưa được thưởng hôm nay | Chọn 5 sao, viết 30 ký tự, đính 1 ảnh JPG, gửi | `Áo đẹp, vải mát, form chuẩn như mô tả.` | Đánh giá hiển thị; +2 Fitken; toast thông báo thưởng | ✅ | — | ❌ | ❌ | `reviewRewardRequiresImageAndEnoughContent` |
| REV-03 | E | P1 | Đã được thưởng đánh giá hôm nay | Gửi đánh giá có ảnh cho sản phẩm khác | — | Đăng được, không thưởng; toast "…Hôm nay bạn đã nhận thưởng đánh giá, quay lại vào ngày mai nhé." | ✅ | — | ❌ | ❌ | `onlyOnePhotoReviewPerDayIsRewarded` |
| REV-04 | E | P1 | — | Gửi đánh giá không ảnh, 50 ký tự | — | Đăng được, không thưởng | ✅ | — | ❌ | ❌ | |
| REV-05 | E | P2 | — | Nội dung 19 ký tự | — | Nút "Gửi đánh giá" bị khoá; bộ đếm "19/2000 ký tự" | — | ❌ | ❌ | ❌ | |
| REV-06 | E | P2 | — | Nội dung 2001 ký tự (qua API) | — | "Nội dung đánh giá tối đa 2000 ký tự" | ❌ | — | — | ❌ | |
| REV-07 | E | P2 | — | Gửi 0 sao / 6 sao (qua API) | — | "Số sao từ 1 đến 5" | ❌ | — | — | ❌ | |
| REV-08 | E | P1 | Đã đánh giá sản phẩm | Đánh giá lần 2 | — | "Bạn đã đánh giá sản phẩm này rồi" | ❌ | — | ❌ | ❌ | |
| REV-09 | E | P1 | — | Đính 6 ảnh | — | "Tối đa 5 ảnh cho mỗi đánh giá" | ❌ | ❌ | ❌ | ❌ | |
| REV-10 | W | P0 | — | Gửi đánh giá với URL ảnh ngoài hoặc ảnh của người khác | `https://evil.com/a.jpg`, `/uploads/reviews/<userB>-x.jpg` | "Ảnh đánh giá không hợp lệ, vui lòng tải ảnh lên lại" | ✅ | — | — | ❌ | `externalImageUrlsAreRejected` |
| REV-11 | E | P1 | Khách | Viết đánh giá / upload ảnh | — | Yêu cầu đăng nhập | ✅ | — | ❌ | ❌ | `writingReviewsAndUploadingRequireLogin` |
| REV-12 | E | P2 | — | Upload ảnh đánh giá > 5 MB / GIF | — | Từ chối với thông báo định dạng / dung lượng | ❌ | ✅ | ❌ | ❌ | |
| REV-13 | H | P1 | Đã bấm mua sản phẩm qua FitMe và tự xác nhận đã mua (hoặc brand Plus tích "Đã bán" cho lead) | Viết đánh giá | — | Có nhãn "Đã mua hàng"; brand bỏ tích thì mất nhãn | ✅ | — | ❌ | ❌ | `verifiedPurchaseBadgeFollowsSelfConfirmedBuyClicks`; xem PUR-04, LEAD-08. Trước V27 nhãn dựa vào đơn đã giao |
| REV-14 | E | P2 | Chưa xác nhận mua sản phẩm | Viết đánh giá | — | Đăng được, không có nhãn "Đã mua hàng" | ❌ | — | ❌ | ❌ | Rủi ro đánh giá ảo để lấy Fitken |
| REV-15 | H | P1 | Đánh giá của người khác | Bấm "Hữu ích" | — | Số lượt +1; bấm lại không cộng thêm; bỏ bình chọn thì −1 (không âm) | ✅ | — | ❌ | ❌ | `helpfulVotesAreCountedOncePerUser…` |
| REV-16 | E | P2 | Đánh giá của chính mình | Bấm "Hữu ích" | — | "Bạn không thể bình chọn cho đánh giá của chính mình" | ✅ | — | ❌ | ❌ | |
| REV-17 | W | P0 | — | Nội dung chứa HTML / script | `<script>alert(1)</script><b>đẹp</b>` | Hiển thị đúng như văn bản; không chạy script | ❌ | ❌ | ❌ | ❌ | |
| REV-18 | W | P2 | Đánh giá lúc 23:59 và 00:01 giờ Việt Nam | Gửi 2 đánh giá có ảnh | — | Cả 2 được thưởng (khác ngày) | ❌ | — | — | ❌ | |
| REV-19 | H | P1 | Admin | `/admin/reviews` → ẩn đánh giá, tích thu hồi thưởng | — | Đánh giá biến mất khỏi trang sản phẩm; Fitken đã thưởng bị thu hồi (không âm) | ✅ | — | ❌ | ❌ | `adminCanHideReviewAndRevokeReward` |
| REV-20 | H | P2 | Admin | Ẩn đánh giá không tích thu hồi | — | Ẩn nhưng giữ Fitken; ghi chú mặc định "Đánh giá vi phạm quy định" | ❌ | — | ❌ | ❌ | |
| REV-21 | E | P2 | Đánh giá đã ẩn | Người dùng bấm "Hữu ích" qua API | — | Bị từ chối | ❌ | — | — | ❌ | |
| REV-22 | H | P2 | — | `GET /products/featured-reviews` | — | Chỉ đánh giá ≥ 4 sao, ≥ 20 ký tự, sắp theo hữu ích | ❌ | — | — | ❌ | Hiển thị trên trang chủ |
| REV-23 | W | P1 | — | Gửi cùng 1 đánh giá 2 lần thật nhanh | — | Chỉ tạo 1 bản; lần 2 bị từ chối (khoá duy nhất) | ❌ | — | — | ❌ | Có thể trả 409 |
