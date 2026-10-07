# FitMe AI: bộ test case toàn hệ thống

Cập nhật: 07/10/2026 · Prod: frontend https://fitme-ai-mvp.vercel.app · backend https://fitme-ai-mvp.onrender.com

**Tổng quan:**

- **923 test case**: 348 happy, 313 edge, 262 worst.
- **Độ phủ:** 573 case đã pass ở ít nhất một loại test, 350 case chưa pass ở loại nào.
- **Theo ưu tiên:** 154 P0, 430 P1, 339 P2. Còn **12 case P0 chưa được test** (05/10 là 33).
- **Đổi mô hình (07/10/2026):** FitMe gỡ thương mại in-app (V27) và chuyển sang Brand Plus (V28–V32). Đã xoá 123 case giỏ / thanh toán đơn / đơn hàng / địa chỉ / đối soát / voucher người dùng, thêm 186 case cho Premium, trần Fitken, brand yêu thích, Brand Plus, voucher brand, khách quan tâm, cài đặt hệ thống, khách quay lại. ID đã xoá không dùng lại; danh sách ở [KNOWN_ISSUES.md](test-cases/KNOWN_ISSUES.md#sau-khi-gỡ-thương-mại-v27-và-chuyển-sang-brand-plus).
- **Lỗi đã biết:** 55 case từng ghi nhận lỗi (🐞), gộp thành 50 lỗi. **Cả 50 lỗi đã được sửa** và kiểm tra lại, xem [KNOWN_ISSUES.md](test-cases/KNOWN_ISSUES.md). Trong file module, ghi chú 🐞 cũ được đổi thành "Đã sửa #N (commit)".

Mỗi case gồm: tiền điều kiện, các bước, dữ liệu test, kết quả mong đợi (thông báo tiếng Việt và giới hạn lấy đúng từ code), trạng thái theo 4 loại test và ghi chú tham chiếu tên test.

## 1. Thống kê

### Theo loại test

| Loại test | ✅ Pass | ❌ Chưa test | 🟡 Có spec, chưa chạy CI | ⚠️ Lỗi thời | — Không áp dụng |
|---|---|---|---|---|---|
| BE (JUnit) | 420 | 280 | — | — | 223 |
| FE (Vitest) | 169 | 155 | — | — | 599 |
| E2E (Playwright) | 115 | 374 | 0 | 0 | 434 |
| PROD | 140 | 763 | — | — | 20 |

### Theo loại case

| Loại case | Số case | Đã pass ≥ 1 loại test | Tỉ lệ |
|---|---|---|---|
| H (happy) | 348 | 273 | 78% |
| E (edge) | 313 | 170 | 54% |
| W (worst) | 262 | 130 | 50% |
| **Tổng** | **923** | **573** | **62%** |

Worst case tăng từ 30% (05/10) lên 50% nhờ bộ test BE cho P0 (tấn công, đồng thời, webhook giả) và test tích hợp của Brand Plus, voucher brand, khách quan tâm. Phần còn yếu là edge case ở FE và các kiểm tra chỉ làm được trên prod. Số case PROD ✅ giảm từ 167 xuống 140 vì các case đổi kết quả mong đợi khi chuyển sang Brand Plus được đặt lại; đợt kiểm thử prod 07/10 (mục 6) đã chạy các luồng chính nhưng chưa đánh dấu lại từng case.

## 2. Danh mục module

| # | Module | Nhóm (tiền tố ID) | Số case | H / E / W | Đã pass | Chưa pass | 🐞 |
|---|---|---|---|---|---|---|---|
| 01 | [Xác thực & tài khoản](test-cases/01-auth.md) | AUTH-REG, AUTH-VER, AUTH-LOG, AUTH-TOK, AUTH-PWD, AUTH-CHP, AUTH-POR | 113 | 23 / 48 / 42 | 50 | 63 | 0 |
| 02 | [Phiên ẩn danh, hồ sơ, vibe quiz](test-cases/02-session-profile.md) | SES, PRO, QUIZ | 46 | 12 / 23 / 11 | 27 | 19 | 0 |
| 03 | [Tư vấn AI (stylist chat)](test-cases/03-ai-stylist.md) | AI-CHAT, AI-TOP, AI-GEM, AI-REC, AI-ACT | 77 | 35 / 22 / 20 | 47 | 30 | 0 |
| 04 | [Thử mặc AI & avatar mẫu](test-cases/04-try-on.md) | TRY-SEL, TRY-INP, TRY-GEN, TRY-RES, TRY-2D, AVA | 90 | 37 / 33 / 20 | 70 | 20 | 0 |
| 05 | [Danh mục, sản phẩm, đánh giá](test-cases/05-catalog-review.md) | CAT-DIS, CAT-PDP, REV | 53 | 25 / 20 / 8 | 28 | 25 | 0 |
| 06 | [Brand Plus, voucher brand, khách quan tâm](test-cases/06-brand-plus-voucher-lead.md) | BP-BUY, BP-REN, BV-ISS, BV-USE, PLUS, LEAD, CUS | 89 | 31 / 38 / 20 | 78 | 11 | 0 |
| 07 | [Fitken, gói Premium, brand yêu thích, nhận thưởng](test-cases/07-fitken-premium-rewards.md) | FIT, SUB, PREM, PREF, RWD-CHK, RWD-SHR | 73 | 28 / 31 / 14 | 47 | 26 | 0 |
| 08 | [Tủ đồ, thư viện, đã lưu, chuyển hướng mua](test-cases/08-wardrobe-gallery-redirect.md) | WAR, GAL, SAV, RED, PUR | 49 | 22 / 17 / 10 | 35 | 14 | 0 |
| 09 | [Quyền riêng tư & email](test-cases/09-privacy-email.md) | PRV, MAIL | 32 | 13 / 7 / 12 | 20 | 12 | 0 |
| 10 | [Cổng thương hiệu (Brand portal)](test-cases/10-brand-portal.md) | BR-APP, BR-PRD, BR-PLN, BR-LEAD, BR-ANA, BR-SET | 64 | 28 / 26 / 10 | 36 | 28 | 0 |
| 11 | [Cổng quản trị (Admin portal)](test-cases/11-admin-portal.md) | ADM-DSH, ADM-USR, ADM-BRD, ADM-PRD, ADM-PLN, ADM-VCH, ADM-SET, ADM-TRF, ADM-GRW, ADM-RET, ADM-ACC | 104 | 54 / 36 / 14 | 72 | 32 | 0 |
| 12 | [Bảo mật](test-cases/12-security.md) | SEC-AUZ, SEC-INJ, SEC-UPL, SEC-ABU, SEC-CFG | 51 | 0 / 0 / 51 | 22 | 29 | 0 |
| 13 | [Giao diện, điều hướng, responsive, SEO](test-cases/13-ui-navigation-seo.md) | NAV, UI, RSP, A11Y, SEO | 49 | 28 / 8 / 13 | 26 | 23 | 0 |
| 14 | [Hạ tầng, tác vụ nền, hiệu năng, CI](test-cases/14-infra-performance.md) | INF, JOB, PERF, CI | 33 | 12 / 4 / 17 | 15 | 18 | 0 |
| | **Tổng** | | **923** | **348 / 313 / 262** | **573** | **350** | **0** |

Lỗi đã biết, phân theo mức độ kèm gợi ý vị trí sửa: [test-cases/KNOWN_ISSUES.md](test-cases/KNOWN_ISSUES.md).

## 3. Bốn loại test

| Mã | Loại test | Công cụ | Chạy ở đâu | Quy mô hiện tại |
|---|---|---|---|---|
| **BE** | Backend unit + integration | JUnit 5, MockMvc, Spring Boot Test (`backend/src/test`) | CI mỗi lần push | 389 phương thức test / 94 class (đếm trong code ở `bc323e2`); pass hết, 3 test @Disabled là lỗ hổng đã biết |
| **FE** | Frontend unit | Vitest + Testing Library (`frontend/src/**/*.test.ts(x)`) | CI mỗi lần push | 273 test / 64 file (đếm trong code), tất cả pass |
| **E2E** | End-to-end trên trình duyệt | Playwright (`frontend/e2e`) | CI chạy **toàn bộ** mỗi lần push | 22 spec / 127 test chromium + 5 test mobile-chrome |
| **PROD** | Kiểm thử trên môi trường thật | Playwright headless + script API + thao tác tay | Vercel + Render, 04–07/10/2026 | 95 trang × 4 vai trò, 45 kiểm tra API, script kiểm tra từng vòng sửa lỗi, 5 luồng hồi quy |

### Cách chạy

```powershell
# BE: cần Docker (Testcontainers) hoặc Postgres local
cd backend; mvn test

# FE unit
cd frontend; npm test

# E2E: cần backend + frontend đang chạy local. Backend chạy như CI:
# FITME_SEED_ENABLED, FITME_AUTH_EXPOSE_VERIFICATION_CODE, FITME_TEST_EXPOSE_RESET_TOKENS = true; FITME_AUTH_MIN_FORM_MS=0
cd frontend; npx playwright test --project=chromium --workers=1
npx playwright test e2e/mobile-nav.spec.ts --project=mobile-chrome
npm run test:e2e -- e2e/redirect-flow.spec.ts   # chạy 1 spec
npm run test:e2e:roles                     # luồng theo vai trò
```

PROD: thao tác theo cột "Các bước" trong từng file module, chỉ dùng tài khoản test.
Không thanh toán PayOS thật, hạn chế tạo preview FASHN (tốn phí), dọn dữ liệu test sau khi chạy.

## 4. Quy ước

### Ký hiệu trạng thái

| Ký hiệu | Ý nghĩa |
|---|---|
| ✅ | Đã có test và **pass** (BE / FE / E2E pass trong CI ở commit `bc323e2`; PROD đã kiểm tra thực tế) |
| 🟡 | Có spec E2E nhưng **không chạy trong CI**, chưa xác nhận đang pass |
| ⚠️ | Có test nhưng **lỗi thời**, sẽ fail nếu chạy (cần sửa spec) |
| ❌ | **Chưa test** |
| — | Không áp dụng cho loại test này |
| 🐞 (cột ghi chú) | Rà code thấy hành vi hiện tại **khác** kết quả mong đợi, nên case sẽ fail. Xem [KNOWN_ISSUES.md](test-cases/KNOWN_ISSUES.md) |

### Loại case và ưu tiên

| Mã | Ý nghĩa |
|---|---|
| **H** | Happy case: luồng chuẩn, dữ liệu hợp lệ |
| **E** | Edge case: giá trị biên, dữ liệu sai, trạng thái bất thường |
| **W** | Worst case: tấn công, lạm dụng, đồng thời, mất mạng, dịch vụ ngoài lỗi, chi phí |
| **P0** | Hỏng là mất tiền, mất dữ liệu, lộ dữ liệu hoặc chặn luồng chính; phải test trước mỗi release |
| **P1** | Chức năng quan trọng; test khi đụng tới module |
| **P2** | Phụ, hiển thị, trải nghiệm |

### Cột của mỗi bảng

`ID | Loại | Ưu tiên | Tiền điều kiện | Các bước | Dữ liệu test | Kết quả mong đợi | BE | FE | E2E | PROD | Ghi chú`

Đầu mỗi file module có mục **"Quy tắc nghiệp vụ (đọc từ code)"** tóm tắt giới hạn, thời hạn, phí và thông báo lỗi dùng làm căn cứ cho kết quả mong đợi.

### Tài khoản test

| Vai trò | Email |
|---|---|
| User | `khangntse180776@fpt.edu.vn`, `user@fitme.ai` |
| User Premium (seed) | `premium@fitme.ai` (dùng cho tủ đồ, brand yêu thích; E2E `loginPremiumUser`) |
| Admin | `admin@fitme.ai` |
| Brand | `brand@fitme.ai` |

Mật khẩu không ghi trong tài liệu. Seed local lấy từ biến môi trường `FITME_SEED_PASSWORD`; script kiểm thử prod đọc `FITME_EMAIL` / `FITME_PASSWORD`. Hỏi người quản lý môi trường để lấy giá trị.

## 5. Spec E2E và trạng thái

Từ commit `8255502`, CI chạy toàn bộ spec mỗi lần push (job "E2E (full suite)": chromium 1 worker, retry 2; mobile-nav trên mobile-chrome). Trước đó CI chỉ chạy 4 spec. Ở V27 `commerce.spec.ts` bị xoá cùng giỏ hàng, còn 22 spec.

| Spec | Số test | Chạy trong CI | Trạng thái |
|---|---|---|---|
| smoke-routes.spec.ts | 20 | Có | ✅ Pass (`/pricing` kiểm tra tiêu đề "FitMe Free & Premium") |
| role-flows.spec.ts | 34 | Có | ✅ Pass (luồng tủ đồ đăng nhập tài khoản Premium) |
| rbac.spec.ts | 5 | Có | ✅ Pass |
| mobile-nav.spec.ts | 5 | Có (mobile-chrome) | ✅ Pass |
| try-on.spec.ts | 3 | Có | ✅ Pass (đã sửa: avatar yêu cầu đăng nhập, số đo không bị xoá khi upload ảnh) |
| admin-full.spec.ts | 20 | Có | ✅ Pass (gồm Voucher brand, Khách quay lại, Cài đặt hệ thống, 2 tab Gói dịch vụ) |
| admin-portal.spec.ts | 1 | Có | ✅ Pass |
| ai-extras.spec.ts | 2 | Có | ✅ Pass |
| auth-flow.spec.ts | 5 | Có | ✅ Pass |
| auth-pages.spec.ts | 2 | Có | ✅ Pass |
| brand-full.spec.ts | 16 | Có | ✅ Pass (gồm Khách quan tâm, Gói Plus, link mua bắt buộc) |
| brand-portal.spec.ts | 1 | Có | ✅ Pass |
| consultation-anonymous.spec.ts | 2 | Có | ✅ Pass |
| discover.spec.ts | 1 | Có | ✅ Pass |
| navigation.spec.ts | 4 | Có | ✅ Pass |
| photo-preview.spec.ts | 1 | Có | ✅ Pass |
| product-advice.spec.ts | 1 | Có | ✅ Pass |
| redirect-flow.spec.ts | 3 | Có | ✅ Pass (gồm bật / tắt đồng ý chia sẻ thông tin với brand ở trang xác nhận) |
| reset-password.spec.ts | 1 | Có | ✅ Pass (dùng tài khoản mới tạo, không đụng tài khoản seed) |
| saved-outfits.spec.ts | 1 | Có | ✅ Pass |
| try-on-extras.spec.ts | 2 | Có | ✅ Pass |
| wardrobe.spec.ts | 2 | Có | ✅ Pass (Premium dùng được; Free thấy thẻ nâng cấp) |

## 6. Kết quả kiểm thử trên prod

### Đợt 1 (04–05/10/2026): quét toàn hệ thống

| Hạng mục | Phạm vi | Kết quả |
|---|---|---|
| Quét trang | Khách 23 · User 34 · Admin 23 · Brand 15 trang | 95/95 tải được, không crash / 404 / 5xx |
| API | Đăng nhập, RBAC, danh mục, giỏ, xem trước đơn, tủ đồ, Fitken, khoá / mở tài khoản, dashboard admin / brand | 45/45 pass |
| Luồng UI | Tư vấn AI khách vãng lai đến thử mặc; mua sắm đến trang thanh toán; form đăng ký | Pass |
| Avatar mẫu | Admin thêm / đổi thứ tự / ẩn / xoá; người dùng chọn avatar | Pass |
| Email | Quên mật khẩu qua Gmail relay; relay sai secret | Pass |
| Lỗi tìm thấy và đã sửa | CTR 350%, thứ tự size, nút quay lại về trang đăng nhập, 403 ví Fitken cho khách, badge vai trò xuống dòng, số thứ tự avatar sau khi xoá | Đã deploy và kiểm tra lại |

### Đợt 2 (06–07/10/2026): sửa 50 lỗi và hồi quy

Mỗi vòng sửa lỗi chạy script API kiểm tra đúng các lỗi của vòng đó sau khi Render deploy xong (chi tiết từng lỗi ở [KNOWN_ISSUES.md](test-cases/KNOWN_ISSUES.md)). Sau vòng cuối, chạy bộ hồi quy Playwright trên prod (commit backend `8255502`, test `1352ea1`):

| Luồng | Kết quả |
|---|---|
| Tư vấn AI, lưu outfit, gợi ý sản phẩm tương tự (#40) | ✅ 6 sản phẩm cùng loại (váy / giày), không trùng món gốc; outfit đã bỏ lưu sau khi test |
| 1 lần thử mặc FASHN bằng avatar mẫu | ✅ Kết quả VTON, trừ đúng 1 Fitken |
| Đặt 1 đơn COD qua giao diện rồi huỷ | ✅ Đơn CANCELLED, tồn kho trả lại, địa chỉ test đã xoá |
| Tạo đơn PayOS qua API (không mở link thanh toán) rồi huỷ | ✅ Có `checkoutUrl`, trạng thái PENDING_PAYMENT, huỷ xong tồn kho trả lại |
| Portal brand và admin | ✅ Tải được |
| Cố ý không chạy | Thanh toán gói Pro (nay là Premium) qua PayOS |

Hai đợt trên chạy trước khi gỡ thương mại (V27): các luồng giỏ, đơn COD, đơn PayOS không còn.

### Đợt 3 (07/10/2026): chuyển sang Brand Plus

Mỗi giai đoạn (V27 → V32 và trang khách quay lại) chạy đúng vòng: CI xanh, deploy Render, script API kiểm tra trên prod. Sau giai đoạn cuối chạy lại bộ hồi quy Playwright prod (`frontend/e2e-prod`, 7/7 pass):

| Luồng | Kết quả |
|---|---|
| Endpoint thương mại cũ (`/cart`, `/orders`, `/me/addresses`, `/me/vouchers`) | ✅ 404; mọi sản phẩm có `purchaseUrl` hợp lệ và cờ `plusBrand` |
| Tư vấn AI, lưu outfit, sản phẩm tương tự | ✅ Outfit đã bỏ lưu sau khi test |
| Báo giá thử đồ + 1 lần thử FASHN | ✅ `freeDailyLimit` khớp cài đặt admin; sản phẩm không thuộc brand Plus trừ đúng 1 Fitken; nhãn "Tốn 1 Fitken" hiện trên trang nhập |
| Ví Fitken | ✅ `maxBalance` khớp `fitken.max_balance` |
| Bấm mua có đồng ý chia sẻ | ✅ Tối đa 1 lead/người/sản phẩm/ngày; brand chưa Plus chỉ thấy số lượng, tick "Đã bán" bị 403; dashboard brand không có email; consent đã trả về như cũ |
| Mua Brand Plus kèm voucher 50% | ✅ Link PayOS thật (`mock=false`) 499.500đ, voucher RESERVED; huỷ đơn → voucher về ISSUED, brand vẫn chưa có Plus. Dùng chiến dịch `[TEST] Hồi quy prod` (luôn tắt sau khi chạy) |
| Portal brand và admin (gói Plus, khách quan tâm, cài đặt, gói dịch vụ, voucher brand, khách quay lại) | ✅ Tải được |
| Cố ý không chạy | Thanh toán thật gói Premium / Brand Plus; kích hoạt Plus trên prod (cần trả tiền), nên lượt thử miễn phí và tick "Đã bán" chỉ được kiểm bằng test BE |

## 7. Đề xuất ưu tiên

### P0: 22/33 case đã có test BE (07/10/2026)

Bộ test mới gồm 7 class `P0*IntegrationTest` trong `backend/src/test`, chạy cùng CI. Không phát hiện lỗi sản phẩm mới.

| Nhóm | Đã có test BE |
|---|---|
| Tiền & thanh toán gói | SUB-15 (trước là PAY-07: webhook ký sai, chạy chế độ live), SUB-14 (trước là PAY-08), SUB-10. PAY-14, PAY-15, CART-15, CHK-13, CHK-14 đã xoá cùng V27 |
| Phân quyền & token | SEC-AUZ-05, SEC-AUZ-06, AUTH-PWD-14, BR-PRD-20, GAL-09, TRY-INP-17 |
| Injection | SEC-INJ-01, CAT-DIS-06, ADM-GRW-04 (CSV injection) |
| Lạm dụng & cấu hình | AI-CHAT-12, AUTH-LOG-10, SEC-CFG-02 (CORS), SEC-UPL-02 |
| Pháp lý | PRV-08 |

Ghi chú: BR-PRD-20 hiện trả 400 thay vì 403 (test chấp nhận mọi 4xx và kiểm tra sản phẩm không đổi). `GET /products` không phân trang, trả toàn bộ kết quả trong một lần.

### P0 mới khi chuyển sang Brand Plus (07/10/2026)

44 case P0 mới; 43 case đã có test BE / E2E chạy trong CI.

| Nhóm | Case |
|---|---|
| Thanh toán Brand Plus | BP-BUY-01, 04–08, 10, 11, BP-REN-01 |
| Voucher brand | BV-ISS-02, 04, 13, BV-USE-01–04, 10, ADM-VCH-03 |
| Thử đồ miễn phí brand Plus | PLUS-08, 13, 16 |
| Khách quan tâm & đồng ý chia sẻ | LEAD-01, 02, 05, 08, 10–12, PRV-15, PRV-17 |
| Fitken, Premium, cài đặt | FIT-10, FIT-13, SUB-14, SUB-15, ADM-SET-02, ADM-SET-04, ADM-RET-09, ADM-PRD-10 |
| Phân quyền theo gói | SEC-AUZ-11–15 |

Ngoài ra 3 case được nâng lên P0 vì là đường mua / quyền lợi chính: CAT-PDP-12, WAR-02, BR-PRD-05.

### 12 case P0 còn lại

| Case | Lý do |
|---|---|
| SEC-AUZ-16 | Gửi số tiền giả trong body thanh toán Brand Plus; DTO chỉ nhận `voucherId` nhưng chưa có test |
| SEC-ABU-01, SEC-ABU-02, TRY-GEN-21 | **Lỗ hổng đã biết**, test BE đang `@Disabled`: chưa có giới hạn theo IP / toàn hệ thống cho chat AI, đăng ký hàng loạt và tạo thử mặc. Cần quyết định mức giới hạn trước khi làm |
| SEC-AUZ-07, SEC-CFG-01, INF-08 | Cấu hình và hạ tầng prod, kiểm tra tay |
| AUTH-POR-11, AUTH-TOK-02 | Middleware và xử lý token ở FE, cần test FE / E2E |
| SEC-INJ-02, REV-17 | XSS hiển thị trên trình duyệt, cần E2E |
| AI-TOP-06 | Prompt injection, phụ thuộc Gemini thật |

### Thứ tự đề xuất

1. **Giới hạn chi phí:** rate limit theo IP và trần toàn hệ thống cho chat AI, thử mặc FASHN và đăng ký (bật lại 3 test `@Disabled`).
2. **Test FE / E2E còn thiếu:** AUTH-POR-03 (không lưu token khi sai role), AUTH-POR-10 / AUTH-POR-11 (cookie portal), AUTH-TOK-02, XSS (SEC-INJ-02, REV-17).
3. **Quét prod:** header bảo mật, chuỗi bí mật trong bundle JS (SEC-CFG-01), secret JWT prod khác dev (SEC-AUZ-07).
4. **Hạ tầng:** UI khi Render khởi động lạnh (INF-05), tác vụ hẹn giờ bị lỡ khi Render ngủ (JOB-05, JOB-06), load test cơ bản (PERF-01, PERF-03).
5. **Trước khi mở bán Brand Plus:** chuyển PayOS sang live (SEC-CFG-11), viết test cho SEC-AUZ-16, chạy một đợt kiểm thử prod cho module 06, 07, 10, 11 (Premium, Brand Plus, voucher brand, khách quan tâm, cài đặt hệ thống).
