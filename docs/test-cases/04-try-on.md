# 04 · Thử mặc AI & avatar mẫu (TRY / AVA)

[← Mục lục](../TEST_CASES.md)

## Quy tắc nghiệp vụ (đọc từ code)

| Hạng mục | Quy tắc |
|---|---|
| Luồng | `/try-on` (chọn đồ) → `/try-on/selected` → `/try-on/input` → `/try-on/processing` → `/try-on/result/[id]` → màu / size / quyết định. Thanh tiến trình "Chọn đồ → Thông tin → Kết quả" |
| Chế độ | `USER_PHOTO` (ảnh cá nhân) và `AVATAR` (avatar mẫu) cần đăng nhập, tốn **1 Fitken**; `OUTFIT_BOARD_ONLY` bị khoá trên UI ("Tính năng đang được phát triển…"), miễn phí ở backend |
| Vai trò món | Váy liền thay áo + quần; áo hoặc quần thay váy liền; các vai trò khác chỉ thay cùng vai trò. Tối đa 1 món / vai trò. Giày, phụ kiện không gửi sang AI; áo khoác dùng làm áo nếu không có áo |
| Ảnh | Cần đồng ý trước; JPG / PNG / WEBP, ≤ 5 MB. **Kiểm tra chất lượng là giả lập**: PENDING tự thành GOOD |
| Trừ Fitken | Chỉ trừ khi nhà cung cấp nhận job; idempotent theo preview; trừ quỹ gói trước, quỹ thưởng sau. Lỗi gửi → không trừ; lỗi giữa chừng hoặc chỉ trả ảnh minh hoạ → hoàn Fitken |
| Bất đồng bộ | Server poll mỗi 3 giây, job timeout 120 giây; FE poll mỗi 2,5 giây, tối đa 120 giây; gọi generate timeout 60 giây |
| Thư viện | Kết quả AI thật của người đã đăng nhập tự vào thư viện; ảnh minh hoạ / fallback thì không |
| Avatar mẫu | Tên bắt buộc, ≤ 80 ký tự; ảnh phải bắt đầu `/uploads/`, `/catalog/` hoặc `https://`, không chứa `..`; thứ tự đánh lại 1..n khi xoá |

---

## 4.1 Chọn đồ thử (TRY-SEL)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TRY-SEL-01 | H | P0 | — | Mở `/try-on`, chọn 1 áo + 1 quần, bấm tiếp | — | `/try-on/selected` hiện 2 món, nút "Tiếp tục nhập thông tin" | ✅ | ✅ | ✅ | ✅ | `createAddItemGenerateAndResult…`; try-on.spec lỗi thời |
| TRY-SEL-02 | H | P1 | — | Chỉ hiển thị sản phẩm đủ điều kiện thử AI | — | Chỉ sản phẩm `aiTryOnEligible`, nhóm theo brand | ❌ | — | ❌ | ✅ | |
| TRY-SEL-03 | H | P1 | — | Mở `/try-on?product={id}` | — | Sản phẩm được chọn sẵn | — | ❌ | ❌ | ❌ | |
| TRY-SEL-04 | E | P1 | Đã có áo A | Chọn áo B | — | Hộp thoại "Thay áo?" với "Thay đổi" / "Giữ nguyên"; chọn Thay đổi thì B thay A | ✅ | ✅ | ❌ | ❌ | `addItem_replacesExistingItemWithSameRole`, `tryon-role.test` |
| TRY-SEL-05 | E | P1 | Có áo + quần | Chọn váy liền | — | Váy thay cả áo và quần, thông báo nêu tên sản phẩm bị thay | ✅ | ✅ | — | ❌ | "clears top and bottom when adding a one-piece" |
| TRY-SEL-06 | E | P1 | Có váy liền | Chọn áo | — | Áo thay váy liền | ✅ | ✅ | — | ❌ | |
| TRY-SEL-07 | E | P2 | Đã có sản phẩm X | Chọn lại X | — | Toast "Sản phẩm đã có trong outfit", không thêm trùng | ✅ | ✅ | — | ❌ | |
| TRY-SEL-08 | H | P2 | Có áo + quần + giày + áo khoác | Xem danh sách | — | Đủ 4 món; ghi chú giày không được AI ghép | ✅ | — | — | — | `VtonCategoryMapperTest` |
| TRY-SEL-09 | H | P1 | Chỉ có áo | Xem `/try-on/selected` | — | "Preview sẽ ghép từ item bạn đã chọn. Bổ sung thêm để hoàn thiện set:" + gợi ý quần | ✅ | — | — | ❌ | `TryOnOutfitSuggestionsIntegrationTest` |
| TRY-SEL-10 | H | P2 | Có áo + quần | Xem gợi ý | — | "Set cơ bản đã đủ — bạn có thể thêm giày hoặc phụ kiện…" | ❌ | — | — | ❌ | |
| TRY-SEL-11 | E | P2 | Có bộ vest | Xem gợi ý | — | Vest được tính là đủ cả trên và dưới | ✅ | — | — | ❌ | `treatsSuitAsCoveringBottom` |
| TRY-SEL-12 | H | P2 | — | Xoá 1 món khỏi danh sách | — | Danh sách và gợi ý cập nhật | — | ✅ | ❌ | ❌ | `tryon-store.test removeItem` |
| TRY-SEL-13 | E | P2 | Danh sách trống | Bấm tiếp | — | "Chọn ít nhất một sản phẩm để bắt đầu thử mặc." | ❌ | ❌ | ❌ | ❌ | |
| TRY-SEL-14 | H | P2 | — | Mở `/try-on/brand/{id}`, tìm kiếm | — | Chỉ sản phẩm đủ điều kiện của brand đó, lọc theo từ khoá | — | — | — | ✅ | Crawl prod |
| TRY-SEL-15 | H | P2 | Đang trong luồng thử | Mở chi tiết sản phẩm, bấm "Quay lại" | — | Quay về bước thử mặc đang làm | — | ✅ | — | ❌ | `nav-context.test` |
| TRY-SEL-16 | W | P2 | — | Gọi API thêm sản phẩm không đủ điều kiện thử AI | — | Bị từ chối | ✅ | — | — | ❌ | Đã sửa #14 (`d88f285`). Trước đây: Backend không kiểm tra điều kiện khi thêm món |

## 4.2 Nhập thông tin & ảnh (TRY-INP)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TRY-INP-01 | H | P0 | Đã đăng nhập, có ≥ 1 Fitken | Chọn "Avatar mẫu", chọn 1 avatar | Nam 1 | Avatar được tô chọn; nút "Tạo preview thử mặc (Tốn 1 Fitken · còn {n})" | ✅ | ✅ | ✅ | ✅ | try-on.spec vẫn kiểm tra "avatar bị khoá" → lỗi thời |
| TRY-INP-02 | H | P1 | — | Xem danh sách avatar | — | Chỉ avatar đang hiển thị, đúng thứ tự admin đặt | ✅ | — | ❌ | ✅ | |
| TRY-INP-03 | H | P0 | Đã đăng nhập | Chọn "Ảnh của bạn" → tích đồng ý → chọn ảnh JPG 2 MB | Ảnh toàn thân rõ | Ghi consent; upload thành công; nút tạo preview bật | ✅ | ✅ | ✅ | ❌ | `consentUploadQualityAndDelete_withSession`; photo-preview.spec |
| TRY-INP-04 | E | P0 | — | Chọn ảnh khi chưa tích đồng ý | — | Không cho upload; API trả "Cần đồng ý upload ảnh trước" | ✅ | — | ✅ | ❌ | `upload_withoutConsent_returnsBadRequest` |
| TRY-INP-05 | E | P1 | Đã đồng ý | Chọn file PDF, GIF, HEIC | — | "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP." | ✅ | ✅ | ❌ | ❌ | `upload-file.test` |
| TRY-INP-06 | E | P1 | Đã đồng ý | Chọn ảnh 6 MB | — | "Ảnh tối đa 5MB." | ✅ | ✅ | ❌ | ❌ | |
| TRY-INP-07 | E | P2 | Đã đồng ý | Chọn ảnh đúng 5 MB và ảnh WEBP | — | Được chấp nhận | ❌ | ✅ | ❌ | ❌ | |
| TRY-INP-08 | E | P1 | — | Upload ảnh mờ / chỉ thấy mặt | — | Cảnh báo chất lượng, chưa cho tạo preview | ✅ | ✅ | ❌ | ❌ | Đã sửa #16 (`d88f285`). Trước đây: Kiểm tra chất lượng là giả lập, mọi ảnh đều thành GOOD |
| TRY-INP-09 | E | P2 | Ảnh upload từ phiên trước đã hết hạn | Tạo preview | — | "Ảnh đã hết phiên — vui lòng upload lại." | — | ❌ | ❌ | ❌ | |
| TRY-INP-10 | E | P1 | — | Chế độ "Chỉ xem outfit board" | — | Toast "Tính năng đang được phát triển, hiện tại chưa thể sử dụng." | — | — | ✅ | ❌ |  |
| TRY-INP-11 | E | P1 | Khách chưa đăng nhập | Mở `/try-on/input` | — | Không gọi API ví Fitken (không có lỗi 403 trong console) | — | — | — | ✅ | Sửa ở `ee9d956` |
| TRY-INP-12 | E | P2 | Đã có hồ sơ | Xem chiều cao / cân nặng | — | Điền sẵn từ hồ sơ; giới hạn 100–250 cm, 30–200 kg | — | ✅ | — | ✅ | `profile-prefill.test`. Giới hạn khác form hồ sơ (25–250 kg) |
| TRY-INP-13 | E | P2 | Chọn chế độ Avatar | Không chọn avatar, bấm tạo | — | Báo cần chọn avatar | — | ✅ | ❌ | ❌ | `validators.test "requires avatarKey…"` |
| TRY-INP-14 | E | P2 | Chọn chế độ Ảnh | Chưa upload, bấm tạo | — | Báo cần upload ảnh; API "Cần upload ảnh cá nhân cho chế độ này" | ✅ | ✅ | ❌ | ❌ | `userPhotoMode_withoutPhotoUploadId_returnsBadRequest` |
| TRY-INP-15 | H | P2 | — | Vào trang | — | Gọi `/try-on/warmup` để đánh thức máy chủ AI | ❌ | — | — | ❌ | |
| TRY-INP-16 | H | P1 | Đã upload ảnh | Xoá ảnh của tôi | — | Ảnh chuyển trạng thái DELETED, không dùng lại được | ✅ | — | ❌ | ❌ | |
| TRY-INP-17 | W | P0 | User A có `photoUploadId` của user B | Gọi generate với ID đó | — | "Không có quyền truy cập ảnh này" | ✅ | — | — | ❌ | IDOR; BE `P0TryOnIntegrationTest#anotherUsersPhotoUploadId_cannotBeUsedForTryOn` |
| TRY-INP-18 | W | P1 | — | Upload file `.exe` đổi tên `.jpg` nhưng content-type `image/jpeg` | — | Bị từ chối | ✅ | — | — | ✅ | Đã sửa #9 (`934b924`). Trước đây: Chỉ kiểm tra content-type do client khai báo |

## 4.3 Tạo preview & xử lý (TRY-GEN)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TRY-GEN-01 | H | P0 | Đăng nhập, 5 Fitken, chế độ Avatar | Bấm "Tạo preview" | — | Trang xử lý → kết quả ảnh outfit trên avatar; còn 4 Fitken; ảnh vào thư viện | ✅ | ✅ | ❌ | ❌ | `avatarMode_generatesSuccessfully`, `successfulTryOnSpendsOneFitkenAndLandsInGallery`. Prod chưa chạy (tốn FASHN) |
| TRY-GEN-02 | H | P0 | Đăng nhập, chế độ Ảnh | Bấm "Tạo preview" | — | Kết quả ảnh outfit trên ảnh người dùng; trừ 1 Fitken | ✅ | — | ✅ | ❌ | `userPhotoMode_generatesSuccessfully` |
| TRY-GEN-03 | H | P1 | Xử lý bất đồng bộ | Chờ | — | PROCESSING → poll → COMPLETED → tự chuyển trang kết quả | ✅ | ✅ | ✅ | ❌ | `TryOnAsyncVtonIntegrationTest`, `use-tryon-poll.test` |
| TRY-GEN-04 | E | P0 | Khách chưa đăng nhập | Tạo preview Avatar / Ảnh | — | Yêu cầu đăng nhập: "Vui lòng đăng nhập để dùng thử đồ AI (tài khoản mới được tặng Fitken dùng thử)." | ✅ | ❌ | ✅ | ❌ | Đã sửa #17 (`d88f285`). Trước đây: `avatarMode_anonymous_requiresLogin`.  Dialog mời đăng ký ở trang nhập có thể không hiện; lỗi hiện ở trang xử lý |
| TRY-GEN-05 | W | P0 | Đăng nhập, 0 Fitken | Tạo preview | — | `FITKEN_INSUFFICIENT` "Bạn đã hết Fitken. Nâng cấp FitMe Premium để nhận Fitken hàng tháng hoặc nhận thưởng để tiếp tục thử đồ AI."; không trừ âm | ✅ | ❌ | ✅ | ❌ | Đã sửa #17 (`d88f285`). Trước đây: `aiTryOnWithEmptyWalletIsRejected`.  Dialog "Không đủ Fitken" có thể không hiện. Sản phẩm toàn brand Plus còn lượt miễn phí thì không cần Fitken (xem PLUS-08) |
| TRY-GEN-06 | E | P1 | — | Gọi generate khi chưa có món | — | "Cần thêm ít nhất một sản phẩm" | ✅ | — | — | ❌ | `generate_withoutItems_returnsBadRequest` |
| TRY-GEN-07 | E | P1 | Avatar đã bị admin ẩn / xoá | Tạo preview với avatar đó | — | "Cần chọn avatar mẫu hợp lệ" / "Avatar mẫu không còn tồn tại, vui lòng chọn avatar khác" | ✅ | ❌ | ❌ | ❌ | `AdminTryOnAvatarIntegrationTest` |
| TRY-GEN-08 | W | P0 | Nhà cung cấp lỗi ngay khi gửi | Tạo preview | — | Không trừ Fitken; không lưu thư viện; hiện ảnh minh hoạ + thông báo | ✅ | — | — | ❌ | `submitFailureIsNeverChargedNorStoredInGallery` |
| TRY-GEN-09 | W | P0 | Lỗi giữa chừng khi poll | Tạo preview | — | Hoàn 1 Fitken ("Hoàn Fitken do AI thử mặc lỗi") | ✅ | — | — | ❌ | `providerFailureWhilePollingRefundsTheFitken` |
| TRY-GEN-10 | W | P0 | Nhà cung cấp trả ảnh ghép minh hoạ | Tạo preview | — | Hoàn Fitken; không lưu thư viện; ghi chú "Ảnh ghép minh họa tạm thời…" | ✅ | — | — | ❌ | `compositeFallbackFromProvider…` |
| TRY-GEN-11 | W | P1 | Máy chủ AI đang ngủ | Tạo preview | — | Tự thử lại tối đa 40 giây trong lúc máy chủ khởi động | ✅ | — | — | ❌ | `submitJob_retriesWhileSleepingHostBoots…` |
| TRY-GEN-12 | W | P1 | Job > 120 giây | Chờ | — | FE: "Quá thời gian chờ tạo preview. Vui lòng thử lại."; BE: hoàn Fitken | ❌ | ❌ | ❌ | ❌ | |
| TRY-GEN-13 | W | P0 | — | Bấm "Tạo preview" 2 lần liên tiếp | — | Chỉ 1 job, chỉ trừ 1 Fitken | ✅ | ❌ | ❌ | ❌ | `consumeAndRefundAreIdempotentPerReference` (mức ví) |
| TRY-GEN-14 | W | P1 | Đang xử lý | Đóng tab, mở lại sau 1 phút | — | Khôi phục được kết quả (trong "Đã lưu" / thư viện) | ❌ | ❌ | ❌ | ❌ | |
| TRY-GEN-15 | W | P1 | Nhà cung cấp báo quá tải | Tạo preview | — | "AI thử mặc đang quá tải (giới hạn tốc độ) — thử lại sau ít phút…" | ❌ | — | — | ❌ | |
| TRY-GEN-16 | W | P1 | Ảnh không hợp lệ cho AI | Tạo preview | — | "Ảnh không hợp lệ để AI ghép đồ — vui lòng upload ảnh rõ mặt/toàn thân khác." | ❌ | — | — | ❌ | |
| TRY-GEN-17 | H | P2 | Đang xử lý | Quan sát | — | Hiện tiến trình "Đang mặc áo... (1/2)" | ❌ | ✅ | ❌ | ❌ | Đã sửa #43 (`73e0fc9`). Trước đây: FE không map nhãn tiến trình nên không bao giờ hiện |
| TRY-GEN-18 | E | P1 | Outfit chỉ có giày + phụ kiện | Tạo preview | — | Chuyển sang outfit board, không trừ Fitken | ✅ | — | — | ❌ | `shoesAndAccessoryOnly_returnsEmpty` |
| TRY-GEN-19 | H | P1 | Thử mặc xong | Xem header | — | Số Fitken trên header giảm đúng | ❌ | ❌ | ❌ | ❌ | |
| TRY-GEN-20 | W | P1 | Link ảnh tạm của nhà cung cấp hết hạn | Mở lại kết quả cũ | — | Ảnh đã được sao lưu `/uploads/vton-results/…`; link chết hiện placeholder | ✅ | ✅ | — | ❌ | `VtonOutputMirrorServiceTest`, `media-url.test` |
| TRY-GEN-21 | W | P0 | Script gọi generate liên tục bằng nhiều tài khoản mới | — | — | Có giới hạn tần suất để tránh đốt chi phí FASHN | ❌ | — | — | ❌ | Mỗi tài khoản mới có 5 Fitken; không có rate limit; Lỗ hổng đã biết: test BE `P0TryOnIntegrationTest#aiTryOnGenerationFromManyFreshAccounts_isRateLimited` đang @Disabled |
| TRY-GEN-22 | E | P2 | Lỗi khi tạo | Bấm "Thử lại" ở trang lỗi | — | Gọi generate lại | — | ❌ | ❌ | ❌ | |

## 4.4 Trang kết quả & sau thử (TRY-RES)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TRY-RES-01 | H | P1 | Có kết quả | Xem `/try-on/result/{id}` | — | Ảnh kết quả, danh sách món, tuyên bố miễn trừ AI, nút Thử màu khác / Thử size khác / Lưu vào thư viện / Quyết định | — | ✅ | ✅ | ❌ | `Disclaimer.test`; try-on-extras.spec |
| TRY-RES-02 | H | P1 | — | Bấm "Lưu vào thư viện" | — | Toast "Đã lưu vào thư viện ảnh"; có trong "Đã lưu" tab "Kết quả thử mặc" | ✅ | — | ❌ | ❌ | `saveAndGetSaved…` |
| TRY-RES-03 | E | P2 | Kết quả chưa hoàn tất | Gọi save | — | "Chỉ lưu được kết quả đã hoàn thành" | ❌ | — | — | ❌ | |
| TRY-RES-04 | H | P2 | Đã lưu | Bỏ lưu | — | Mất khỏi danh sách | ✅ | — | ❌ | ❌ | `unsave_afterSaving…` |
| TRY-RES-05 | H | P2 | — | "Thử màu khác" → chọn Navy → áp dụng | — | Kết quả cập nhật theo màu mới | ❌ | ✅ | ✅ | ❌ | Đã sửa #15 (`d88f285`). Trước đây: FE gửi sai payload (`{color}` thay vì `{value, productId}`) nên không có gì thay đổi |
| TRY-RES-06 | H | P2 | — | "Thử size khác" → chọn L | — | Kết quả cập nhật | ❌ | ✅ | ✅ | ❌ | Đã sửa #15 (`d88f285`). Trước đây: Cùng lỗi payload như TRY-RES-05 |
| TRY-RES-07 | E | P2 | — | Mở trang màu / size, chưa chọn gì | — | Nút áp dụng bị khoá | — | ✅ | — | ❌ | `TryOnVariantShell.test` |
| TRY-RES-08 | H | P1 | — | Mở trang quyết định | — | Mỗi món có "Mua" (→ `/redirect/confirm/{id}`) hoặc "Không bán" và "Chi tiết" | — | — | ✅ | ❌ | try-on-extras.spec |
| TRY-RES-09 | H | P2 | — | Banner "Nhận Fitken miễn phí" | — | Số Fitken trên banner khớp cấu hình thưởng chia sẻ (3) | — | ❌ | — | ✅ | Đã sửa #44 (`73e0fc9`). Trước đây: UI ghi "Nhận 2 Fitken" |
| TRY-RES-10 | W | P1 | User A | Mở `/try-on/result/{id của B}` | — | Bị chặn / không thấy ảnh của B | ❌ | — | — | ❌ | IDOR |
| TRY-RES-11 | H | P2 | — | Đánh giá kết quả thử mặc | — | Có UI gửi đánh giá | — | — | — | ❌ | Có API nhưng chưa có UI |

## 4.5 Luồng preview 2D cũ (TRY-2D)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TRY-2D-01 | H | P2 | Có outfit | `/ai/preview-outfit` → `/ai/photo-upload` → `/ai/photo-check` → `/ai/processing` → `/ai/preview/{id}` | — | Tạo preview 2D thành công | ❌ | ✅ | ✅ | ❌ | photo-preview.spec |
| TRY-2D-02 | E | P2 | — | Upload ảnh WEBP ở `/ai/photo-upload` | — | Được chấp nhận như mô tả "JPG/PNG/WEBP" | — | ✅ | ❌ | ❌ | Đã sửa #46 (`73e0fc9`). Trước đây: Ô chọn file chỉ nhận JPG/PNG |
| TRY-2D-03 | E | P2 | — | Xem nhãn chất lượng ảnh | — | Nhãn khớp trạng thái backend | — | ✅ | — | ❌ | Đã sửa #47 (`73e0fc9`). Trước đây: FE dùng GOOD/ACCEPTABLE/POOR/INVALID, BE dùng GOOD/LOW_QUALITY/INVALID/PENDING |
| TRY-2D-04 | H | P2 | Có preview 2D | Bấm "Xóa ảnh của tôi" | — | Ảnh bị xoá | ❌ | — | ❌ | ❌ | |
| TRY-2D-05 | W | P2 | Lỗi tạo | — | — | "Không thể tạo preview 2D. Vui lòng thử lại." | — | ❌ | ❌ | ❌ | |

## 4.6 Quản trị avatar mẫu (AVA)

| ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AVA-01 | H | P1 | — | `GET /try-on/avatars` (không cần đăng nhập) | — | Chỉ avatar đang hiển thị, theo thứ tự | ✅ | — | ❌ | ✅ | `seededAvatarsArePublic…`; prod 3 avatar |
| AVA-02 | H | P1 | Admin | `/admin/tryon-avatars` → "Thêm" → upload ảnh + nhập tên → lưu | `Nữ 2`, ảnh PNG 1 MB | Avatar ở cuối danh sách; người dùng thấy ngay ở `/try-on/input` | ✅ | — | ❌ | ✅ | `adminCreatesHidesReordersAndDeletesAvatar` |
| AVA-03 | H | P1 | — | Đổi tên avatar | `Nam 1 (mới)` | Tên cập nhật ở cả admin và trang người dùng | ✅ | — | ❌ | ✅ | |
| AVA-04 | H | P1 | — | Thay ảnh avatar | — | Ảnh mới hiển thị; ảnh cũ bị xoá khỏi storage | ✅ | — | ❌ | ✅ | |
| AVA-05 | H | P1 | — | Ẩn avatar rồi hiện lại | — | Ẩn: biến mất khỏi trang người dùng; hiện: xuất hiện lại đúng vị trí | ✅ | — | ❌ | ✅ | |
| AVA-06 | H | P1 | — | Lên / xuống thứ tự | — | Thứ tự đổi ở cả 2 phía | ✅ | — | ❌ | ✅ | |
| AVA-07 | E | P2 | — | Bấm "Lên" ở avatar đầu, "Xuống" ở avatar cuối | — | Nút bị khoá hoặc không đổi gì, không lỗi | ❌ | — | ❌ | ❌ | |
| AVA-08 | H | P1 | 4 avatar | Xoá avatar thứ 2 | — | Xác nhận xoá; thứ tự còn lại là 1, 2, 3 | ✅ | — | ❌ | ✅ | Lỗi đánh số đã sửa ở `8b565ab` |
| AVA-09 | E | P1 | — | Tên rỗng / chỉ khoảng trắng | — | "Tên avatar mẫu không được để trống" | ✅ | — | ❌ | ❌ | |
| AVA-10 | E | P2 | — | Tên 81 ký tự | — | "Tên avatar mẫu tối đa 80 ký tự" | ✅ | — | ❌ | ❌ | |
| AVA-11 | W | P1 | — | URL ảnh `http://…`, `/uploads/../etc/passwd`, `javascript:` | — | "Đường dẫn ảnh avatar mẫu không hợp lệ" | ✅ | — | — | ❌ | |
| AVA-12 | E | P1 | — | Lưu khi chưa có ảnh | — | "Cần ảnh cho avatar mẫu" | ✅ | — | ❌ | ❌ | |
| AVA-13 | W | P1 | — | Upload file không phải ảnh / > 5 MB | — | 400 với thông báo định dạng / dung lượng | ✅ | — | — | ❌ | |
| AVA-14 | W | P0 | Đăng nhập user / brand | Gọi API quản trị avatar | — | 403 | ✅ | — | — | ❌ | `onlyAdminsCanManage` |
| AVA-15 | E | P2 | — | Gọi move với `direction: "LEFT"` | — | "Hướng sắp xếp không hợp lệ (UP hoặc DOWN)" | ❌ | — | — | ❌ | |
| AVA-16 | E | P1 | Người dùng đang chọn avatar X | Admin ẩn X; người dùng bấm tạo preview | — | Avatar bị bỏ chọn / backend từ chối với thông báo rõ | ✅ | ❌ | ❌ | ❌ | |
| AVA-17 | H | P2 | — | Giao diện admin | — | Lưới thẻ, dialog sửa, xác nhận xoá hiển thị đúng | — | ❌ | ❌ | ✅ | Kiểm tra tay 04/10 |
| AVA-18 | E | P2 | Ẩn hết avatar | Người dùng mở chế độ Avatar | — | Thông báo chưa có avatar, không lỗi | ❌ | ❌ | ❌ | ❌ | |
