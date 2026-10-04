# FitMe AI — Hướng dẫn sử dụng theo vai trò

Tài liệu này dành cho **người dùng cuối, QA, demo và vận hành** — mô tả cách truy cập app (kể cả bản deploy) và sử dụng theo 3 vai trò trong mô hình B2C (FitMe Pro, Fitken, Nhận thưởng, Thư viện ảnh, Mua sắm in-app và Đối soát seller).

> **Lưu ý:** FitMe AI hỗ trợ giỏ hàng và thanh toán trực tiếp trong ứng dụng (COD hoặc PayOS), quản lý vận đơn và đối soát cho seller. Preview AI mang tính minh họa tham khảo.

---

## 1. Truy cập app — đường dẫn deploy

Trong tài liệu này, **`{BASE_URL}`** = URL gốc mà admin/team cung cấp (trang chủ FitMe AI). Mọi đường dẫn khác **ghép sau** `{BASE_URL}`.

Ví dụ: nếu `{BASE_URL}` = `https://fitme-ai-mvp.vercel.app` thì trang Khám phá là  
`https://fitme-ai-mvp.vercel.app/discover`.

### 1.1 Ba môi trường thường gặp

| Môi trường | `{BASE_URL}` mẫu | Ai dùng | Ghi chú |
|------------|------------------|---------|---------|
| **Cloud (Vercel)** | `https://<tên-project>.vercel.app` | Demo public, tester bên ngoài | HTTPS; backend Render có thể **ngủ** — lần mở đầu chờ 30–60 giây |
| **Staging / VPS (Docker test)** | `http://<IP-server>:3000` | QA nội bộ, UAT trên LAN | HTTP; admin cấp IP + port |
| **Local (máy dev)** | `http://localhost:3000` | Dev, test trên máy cá nhân | Chỉ truy cập được trên máy đang chạy app |

**Người dùng thông thường chỉ cần mở `{BASE_URL}` trên trình duyệt** (Chrome, Safari, Edge). Không cần cài app, không cần mở port backend `:8080`.

Hướng dẫn deploy (dành admin): [DEPLOY_VERCEL_RENDER_NEON.md](DEPLOY_VERCEL_RENDER_NEON.md) · [DEPLOY_TEST.md](DEPLOY_TEST.md)

### 1.2 Bảng đường dẫn chính (3 vai trò)

Thay `{BASE_URL}` bằng URL thực tế của bạn.

#### Người dùng (USER) — không cần đăng nhập

| Chức năng | Đường dẫn đầy đủ |
|-----------|------------------|
| Trang chủ | `{BASE_URL}/` |
| Khám phá sản phẩm | `{BASE_URL}/discover` |
| Tìm kiếm nhanh (focus ô search) | `{BASE_URL}/discover#discover-search` |
| Chi tiết sản phẩm | `{BASE_URL}/products/{id}` |
| Bắt đầu tư vấn AI | `{BASE_URL}/ai/start` |
| Thử mặc AI (outfit board) | `{BASE_URL}/try-on` |
| Bảng giá & gói FitMe Pro | `{BASE_URL}/pricing` |
| Tủ đồ (cần session/login để lưu) | `{BASE_URL}/wardrobe` |
| Outfit đã lưu | `{BASE_URL}/saved-outfits` |

#### Người dùng (USER) — cần đăng nhập

| Chức năng | Đường dẫn đầy đủ |
|-----------|------------------|
| Đăng ký | `{BASE_URL}/auth/register` (nhận ngay 5 Fitken dùng thử) |
| Đăng nhập | `{BASE_URL}/auth/login` |
| Trang Nhận thưởng (Fitken) | `{BASE_URL}/rewards` |
| Thư viện ảnh outfit cá nhân | `{BASE_URL}/profile/gallery` |
| Giỏ hàng | `{BASE_URL}/cart` |
| Đặt hàng & thanh toán (COD/PayOS) | `{BASE_URL}/checkout` |
| Lịch sử đơn hàng | `{BASE_URL}/orders` |
| Chi tiết & tracking vận đơn | `{BASE_URL}/orders/{id}` |
| Kết quả thanh toán PayOS gói Pro | `{BASE_URL}/billing/return` |
| Sổ địa chỉ giao hàng | `{BASE_URL}/profile/addresses` |
| Hồ sơ cá nhân | `{BASE_URL}/profile` |
| Quyền riêng tư | `{BASE_URL}/profile/privacy` |
| Quên mật khẩu | `{BASE_URL}/auth/forgot-password` |
| Đặt lại mật khẩu | `{BASE_URL}/auth/reset-password?token=...` |
| Đăng ký đối tác Brand | `{BASE_URL}/brand/onboarding` |
| Theo dõi đơn Brand | `{BASE_URL}/brand/pending` |

#### Brand Owner (Seller) — Dashboard hoàn toàn miễn phí

| Chức năng | Đường dẫn đầy đủ |
|-----------|------------------|
| **Đăng nhập Brand Portal** | `{BASE_URL}/brand/login` |
| Tổng quan (KPI bán hàng, analytics) | `{BASE_URL}/brand/dashboard` |
| Quản lý đơn hàng seller | `{BASE_URL}/brand/orders` |
| Chi tiết đơn seller & vận đơn | `{BASE_URL}/brand/orders/{id}` |
| Đối soát doanh thu & số dư | `{BASE_URL}/brand/settlements` |
| Quản lý sản phẩm | `{BASE_URL}/brand/products` |
| Thêm sản phẩm | `{BASE_URL}/brand/products/new` |
| Phân tích hành vi | `{BASE_URL}/brand/analytics` |
| Cài đặt thương hiệu & payout | `{BASE_URL}/brand/settings` |

#### Admin

| Chức năng | Đường dẫn đầy đủ |
|-----------|------------------|
| **Đăng nhập Admin** | `{BASE_URL}/admin/login` |
| Tổng quan hệ thống | `{BASE_URL}/admin/dashboard` |
| Giám sát đơn hàng toàn sàn | `{BASE_URL}/admin/orders` |
| Chi tiết đơn hàng sàn | `{BASE_URL}/admin/orders/{id}` |
| Quản lý đối soát seller | `{BASE_URL}/admin/settlements` |
| Duyệt bài chia sẻ nhận thưởng | `{BASE_URL}/admin/rewards` |
| Kiểm duyệt đánh giá sản phẩm | `{BASE_URL}/admin/reviews` |
| Quản lý gói cước Pro | `{BASE_URL}/admin/billing/plans` |
| Duyệt thương hiệu | `{BASE_URL}/admin/brands` |
| Duyệt sản phẩm | `{BASE_URL}/admin/products/moderation` |
| Link bị báo lỗi | `{BASE_URL}/admin/flagged-links` |
| Rule AI | `{BASE_URL}/admin/rules/styles` · `{BASE_URL}/admin/rules/occasions` |
| Quyền riêng tư | `{BASE_URL}/admin/privacy` |
| Giám sát try-on lỗi | `{BASE_URL}/admin/try-on-monitoring` |

### 1.3 Ví dụ cụ thể — bản deploy cloud

Sau khi team deploy lên Vercel + Render (xem [DEPLOY_VERCEL_RENDER_NEON.md](DEPLOY_VERCEL_RENDER_NEON.md)), URL thường có dạng:

| Thành phần | URL ví dụ |
|------------|-----------|
| **App cho user (mở link này)** | `https://fitme-ai-mvp.vercel.app` |
| Đăng nhập User | `https://fitme-ai-mvp.vercel.app/auth/login` |
| Brand Portal | `https://fitme-ai-mvp.vercel.app/brand/login` |
| Admin Portal | `https://fitme-ai-mvp.vercel.app/admin/login` |
| API (qua proxy, kiểm tra kỹ thuật) | `https://fitme-ai-mvp.vercel.app/api/v1/products` |

> URL Vercel thực tế phụ thuộc tên project khi deploy — hỏi admin hoặc xem dashboard Vercel. Ví dụ trên chỉ là mẫu.

### 1.4 Ví dụ cụ thể — staging trên VPS / LAN

Admin deploy bằng `docker-compose.test.yml` và mở firewall port **3000**:

| Thành phần | URL ví dụ |
|------------|-----------|
| **App cho user** | `http://203.0.113.10:3000` |
| Brand Portal | `http://203.0.113.10:3000/brand/login` |
| Admin Portal | `http://203.0.113.10:3000/admin/login` |

Biến `PUBLIC_APP_URL` trong `.env.test` **phải khớp** URL trên (scheme + IP + port) — nếu không, đăng nhập/API có thể lỗi CORS.

### 1.5 Kiểm tra app deploy đã sẵn sàng

1. Mở `{BASE_URL}` — thấy trang chủ *「Đúng size, hợp dáng, chuẩn màu — thử trước khi mua.」*
2. Mở `{BASE_URL}/discover` — có danh sách sản phẩm (cần seed hoặc admin đã duyệt SP)
3. (Tùy chọn) Mở `{BASE_URL}/api/v1/products` — JSON `"success": true`

**Cloud Render free:** nếu trang load chậm hoặc API lỗi lần đầu, đợi ~1 phút rồi refresh (backend đang wake up).

### 1.6 Tài khoản demo (seed)

Dùng trên mọi môi trường có bật seed (`FITME_SEED_ENABLED=true`, DB trống lần đầu):

| Email | Mật khẩu | Vai trò | Đăng nhập tại |
|-------|----------|---------|---------------|
| `user@fitme.ai` | `fitme123` | USER | `{BASE_URL}/auth/login` |
| `brand@fitme.ai` | `fitme123` | BRAND_OWNER | `{BASE_URL}/brand/login` |
| `admin@fitme.ai` | `fitme123` | ADMIN | `{BASE_URL}/admin/login` |

Mật khẩu có thể khác nếu admin đổi `FITME_SEED_PASSWORD` khi deploy.

### 1.7 Sử dụng trên điện thoại (mobile)

Trên màn hình **nhỏ hơn tablet** (< 768px), app người dùng có giao diện kiểu app mobile:

**Thanh điều hướng dưới (bottom nav)** — 5 tab cố định:

| Tab | Chức năng |
|-----|-----------|
| Trang chủ | Về `{BASE_URL}/` |
| Khám phá | `{BASE_URL}/discover` |
| **Tư vấn AI** (nút giữa nổi) | `{BASE_URL}/ai/start` |
| Thử mặc | `{BASE_URL}/try-on` |
| Hồ sơ | `{BASE_URL}/profile` (chưa login → trang đăng nhập) |

**Header gọn:** logo FitMe AI + icon tìm kiếm nhanh (không còn menu hamburger).

**Tủ đồ / Outfit đã lưu / Quyền riêng tư:** vào tab **Hồ sơ** → chọn card tương ứng.

**Khám phá trên mobile:** ô tìm kiếm full-width + nút **Bộ lọc** (thương hiệu, danh mục, chỉ SP thử AI).

**Khi bottom nav ẩn:** đang đăng nhập/đăng ký, wizard tư vấn AI (body/style/occasion…), form thử mặc chi tiết, trang redirect — để tập trung hoàn thành luồng.

**Brand / Admin portal:** vẫn dùng giao diện desktop; khuyến nghị mở trên máy tính hoặc tablet ngang.

---

## 2. Chuẩn bị local (dev / QA trên máy)

Phần này dành cho người **tự chạy app trên máy**, không phải bản deploy public.

### Chạy nhanh (Docker)

```bash
cp .env.example .env
docker compose up --build
```

`{BASE_URL}` = `http://localhost:3000`

| Dịch vụ | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API (qua proxy FE) | http://localhost:3000/api/v1 |
| Backend trực tiếp | http://localhost:8080/api/v1 |
| Swagger | http://localhost:8080/swagger-ui.html |

### Chạy local (dev)

```bash
# Terminal 1 — Postgres
docker compose up postgres -d

# Terminal 2 — Backend
cd backend && mvn spring-boot:run

# Terminal 3 — Frontend
cd frontend && npm install && npm run dev
```

---

## 3. Vai trò USER (Người dùng)

### 3.1 Mục đích

Khám phá thời trang Gen Z, nhận tư vấn AI, thử đồ ảo bằng Fitken, nâng cấp gói FitMe Pro (49k/tháng), tích lũy Fitken miễn phí tại trang Nhận thưởng, lưu trữ outfit cá nhân trong thư viện ảnh, và mua sắm trực tiếp qua giỏ hàng in-app (COD hoặc PayOS) kèm theo dõi vận đơn.

### 3.2 Cơ chế Fitken & Gói FitMe Pro

- **Fitken**: Đơn vị tính lượt dùng AI trên FitMe — `1 Fitken = 1 lượt thử đồ AI` (chế độ ảnh người thật `USER_PHOTO` hoặc `AVATAR`). Tạo bảng phối minh họa (`OUTFIT_BOARD_ONLY`) và chat stylist AI hoàn toàn miễn phí.
- **Tặng dùng thử**: Mỗi tài khoản người dùng mới khi khởi tạo ví nhận ngay **5 Fitken** miễn phí một lần duy nhất.
- **Cấu trúc ví 2 ngăn**:
  - `subscription_remaining`: Fitken được cấp từ gói Pro, tự động reset về 0 khi gói hết hạn.
  - `bonus_remaining`: Fitken từ quà tặng dùng thử, nhận thưởng, admin tặng — vĩnh viễn không hết hạn.
  - Hệ thống luôn ưu tiên tiêu Fitken ngăn subscription trước, sau đó mới trừ bonus.
  - Trừ Fitken khi bấm generate và tự động hoàn trả (+1) nếu tạo ảnh thất bại.
- **Gói FitMe Pro (49.000đ/tháng)**:
  - Mua tại `/pricing`, thanh toán quét mã PayOS tự động.
  - Nhận ngay **15 Fitken/tháng**.
  - Tặng **2 voucher FREESHIP** (giảm tối đa 30.000đ/đơn).
  - Mở khóa cá nhân hóa sâu (chế độ coherence `PREFER`/`STRICT`).
  - Hết hạn 30 ngày: hệ thống tự động reset ngăn subscription và chuyển về Free.

### 3.3 Trang Nhận thưởng (`/rewards`)

Người dùng có thể kiếm thêm Fitken miễn phí mỗi ngày (tính theo múi giờ `Asia/Ho_Chi_Minh`):
1. **Điểm danh nhận quà**: Mỗi ngày điểm danh 1 lần. Đạt chuỗi 3 ngày liên tiếp (`streak % 3 == 0`) nhận ngay **+1 Fitken**. Bỏ lỡ 1 ngày chuỗi sẽ bắt đầu lại từ 1.
2. **Chia sẻ bài đăng**: Đăng bài khoe outfit lên mạng xã hội cá nhân (Facebook, TikTok, Instagram, Threads, X/Twitter) rồi dán link công khai tại `/rewards`. Hệ thống kiểm tra hợp lệ và cộng ngay **+2 Fitken** (tối đa 1 lần thưởng/ngày).
3. **Đánh giá sản phẩm có ảnh**: Viết review sản phẩm tại trang chi tiết `/products/{id}` có đính kèm ≥1 ảnh thực tế và nội dung ≥ 20 ký tự được thưởng **+3 Fitken** (thưởng 1 lần cho mỗi đánh giá hợp lệ).

### 3.4 Thư viện ảnh phối đồ (`/profile/gallery`)

- Mỗi khi người dùng đã đăng nhập tạo thành công một ảnh thử đồ AI, hệ thống tự động lưu vào thư viện cá nhân.
- Khách vãng lai sau khi đăng nhập sẽ được tự động liên kết các ảnh đã thử trong phiên.
- Tại `/profile/gallery`, người dùng có thể:
  - Xem lưới ảnh và phóng to chi tiết.
  - Tải ảnh về máy hoặc chia sẻ lên mạng xã hội.
  - Xem danh sách sản phẩm cấu thành outfit và bấm thêm nhanh vào giỏ hàng để mua sắm.
  - Xóa mềm ảnh khỏi thư viện cá nhân.

### 3.5 Giỏ hàng, Đặt hàng in-app & Vận đơn

1. **Giỏ hàng (`/cart`)**:
   - Thêm sản phẩm cùng biến thể màu sắc/kích cỡ vào giỏ.
   - Giỏ hàng tự động gom nhóm theo từng thương hiệu (seller).
2. **Sổ địa chỉ (`/profile/addresses`)**:
   - Quản lý danh sách địa chỉ nhận hàng, chọn địa chỉ mặc định.
3. **Đặt hàng (`/checkout`)**:
   - Tự động tính phí vận chuyển theo số lượng seller (mặc định 30.000đ/seller).
   - Áp dụng voucher FREESHIP từ gói Pro để giảm trừ phí ship.
   - Chọn phương thức thanh toán: **COD** (thanh toán tiền mặt khi nhận hàng) hoặc **PayOS** (chuyển khoản qua cổng VietQR).
4. **Theo dõi đơn hàng (`/orders`, `/orders/{id}`)**:
   - Đơn khách tự động tách thành các đơn seller tương ứng.
   - Xem timeline tracking chi tiết theo từng kiện hàng (mã vận đơn, hãng vận chuyển GHN/GHTK/Viettel Post, trạng thái xuất kho, đang giao, đã giao).
   - Hủy đơn khi các seller chưa xuất kho giao vận.
5. **Kênh chuyển hướng ngoài (phương án bổ trợ)**:
   - Tại trang chi tiết sản phẩm hoặc outfit, người dùng vẫn có thể chọn nút chuyển hướng để mua trên Shopee / TikTok Shop của thương hiệu nếu muốn.

### 3.6 Luồng tư vấn AI & Thử đồ

```mermaid
flowchart LR
  A[Trang chủ /] --> B[Tư vấn AI /ai/start]
  B --> C[Body profile]
  C --> D[Style profile]
  D --> E[Occasion]
  E --> F[Kết quả /ai/result]
  A --> G[Khám phá /discover]
  G --> H[Chi tiết SP /products/id]
  H --> I[Thêm giỏ hàng /cart]
  I --> J[Thanh toán /checkout]
  A --> K[Thử mặc /try-on]
  K --> L[Kết quả preview ảnh cá nhân -1 Fitken]
  L --> M[Lưu thư viện /profile/gallery]
```

### 3.7 Bảng tính năng cần đăng nhập

| Hành động | Đường dẫn | Quyền lợi & Ghi chú |
|-----------|-----------|---------------------|
| Đăng ký | `/auth/register` | Nhận ngay **5 Fitken** dùng thử |
| Đăng nhập | `/auth/login` | Đồng bộ dữ liệu tư vấn & ảnh thử đồ từ phiên ẩn danh |
| Nâng cấp gói Pro | `/pricing` | Mua gói Pro 49k/tháng qua PayOS |
| Nhận thưởng | `/rewards` | Điểm danh, nộp link chia sẻ, tích lũy Fitken |
| Thư viện ảnh | `/profile/gallery` | Bộ sưu tập ảnh outfit cá nhân |
| Giỏ hàng & Mua hàng | `/cart` → `/checkout` | Đặt hàng in-app COD / PayOS |
| Quản lý đơn | `/orders` | Lịch sử đơn và tracking vận chuyển |
| Sổ địa chỉ | `/profile/addresses` | Địa chỉ nhận hàng |
| Hồ sơ | `/profile` | Body/style profile |
| Quyền riêng tư | `/profile/privacy` | Yêu cầu xóa dữ liệu / consent |
| Tủ đồ | `/wardrobe` | Thêm item cá nhân vào tủ ảo |
| Outfit đã lưu | `/saved-outfits` | Quản lý gợi ý phối đồ đã lưu |

### 3.4 Đăng ký làm đối tác Brand (từ USER)

1. Đăng ký USER tại `/auth/register`
2. Vào `/brand/onboarding` — điền tên brand, email, website, mô tả
3. Theo dõi trạng thái tại `/brand/pending` (PENDING)
4. Admin duyệt → **đăng xuất và đăng nhập lại** tại `/brand/login`
5. Vào portal brand `/brand/dashboard`

### 3.5 Checklist test USER

| # | Kịch bản | Cách chạy tự động |
|---|----------|-------------------|
| 1 | Tư vấn ẩn danh → có kết quả AI | `npx playwright test e2e/role-flows.spec.ts -g "tư vấn outfit ẩn danh"` |
| 2 | Try-on → preview kết quả | `-g "thử mặc AI"` |
| 3 | Discover → mua → redirect | `-g "khám phá"` |
| 4 | Login → profile → wardrobe → saved | `-g "đăng nhập → hồ sơ"` |
| 5 | Forgot password MVP | `-g "quên mật khẩu"` |
| 6 | Privacy → gửi yêu cầu xóa | `-g "quyền riêng tư"` |
| 7 | Tư vấn từ SP → lưu → saved list | `-g "tư vấn từ sản phẩm"` |
| 8 | Wardrobe → tư vấn ưu tiên tủ đồ | `-g "tủ đồ → thêm item"` |

**Chạy toàn bộ luồng USER + public:**

```powershell
cd frontend
npx playwright test e2e/role-flows.spec.ts --grep "Luồng công khai|Luồng USER" --workers=1
```

**Test thủ công nhanh:** đăng nhập `user@fitme.ai` / `fitme123` → `/discover` → chọn sản phẩm → **Tư vấn size & phối đồ bằng AI** → hoàn thành wizard → **Lưu gợi ý** → kiểm tra `/saved-outfits`.

---

## 4. Vai trò BRAND_OWNER (Đối tác thương hiệu / Seller)

### 4.1 Mục đích

Quản lý catalog sản phẩm, xử lý đơn hàng seller in-app, tạo vận đơn giao hàng, theo dõi đối soát doanh thu, thiết lập tài khoản nhận tiền và xem báo cáo analytics tổng hợp.

> **Chính sách:** Dashboard brand được mở **hoàn toàn miễn phí** cho mọi thương hiệu đã được duyệt (`APPROVED`). FitMe không còn thu phí gói brand định kỳ hay giới hạn lượt try-on của shop.

### 4.2 Truy cập portal

1. Mở **`{BASE_URL}/brand/login`**
2. Đăng nhập tài khoản brand đã được admin duyệt
3. Middleware FE chặn `/brand/*` nếu cookie `fitme-role` ≠ `BRAND`

### 4.3 Các màn hình portal

| Đường dẫn | Chức năng |
|-----------|-----------|
| `/brand/dashboard` | Tổng quan KPI kinh doanh & analytics |
| `/brand/orders` | Danh sách đơn hàng seller của shop (lọc theo trạng thái) |
| `/brand/orders/{id}` | Chi tiết đơn, địa chỉ nhận hàng, trạng thái đóng gói & vận đơn |
| `/brand/settlements` | Báo cáo đối soát doanh thu, số dư chờ chuyển khoản & lịch sử thanh toán |
| `/brand/products` | Danh sách sản phẩm của shop |
| `/brand/products/new` | Tạo sản phẩm mới |
| `/brand/products/{id}/edit` | Sửa, **Gửi duyệt** |
| `/brand/products/{id}/analytics` | Analytics chi tiết theo từng sản phẩm |
| `/brand/analytics` | Phân tích tổng thể phễu khách hàng |
| `/brand/analytics/redirect` | Click chuyển hướng sang Shopee/TikTok |
| `/brand/analytics/dropoff` | Điểm rời bỏ funnel |
| `/brand/analytics/hesitation` | Hành vi do dự của khách |
| `/brand/analytics/try-on` | Thống kê lượt thử đồ AI |
| `/brand/settings` | Cài đặt thông tin thương hiệu & tài khoản ngân hàng nhận tiền (Payout Account) |

### 4.4 Quy trình xử lý đơn hàng & Vận đơn (Fulfillment)

Khi khách đặt hàng in-app, hệ thống tự động tách thành đơn seller cho từng brand:
1. **Xác nhận đơn (`Confirm`)**: Shop kiểm tra đơn tại `/brand/orders/{id}` và bấm **Xác nhận**.
2. **Đóng gói (`Pack`)**: Shop chuẩn bị hàng và bấm **Đã đóng gói**.
3. **Giao vận (`Ship`)**: Chọn đơn vị vận chuyển (`GHN`, `GHTK`, `VIETTEL_POST` hoặc `SELF`), nhập mã vận đơn (hệ thống tự sinh nếu để trống). Đơn hàng chuyển sang trạng thái `SHIPPING`.
4. **Cập nhật hành trình**: Shop có thể cập nhật sự kiện vận đơn thủ công hoặc thông qua webhook tích hợp từ hãng vận chuyển (`POST /api/v1/webhooks/logistics`).
5. **Giao thành công (`Delivered`)**: Đơn chuyển sang hoàn tất và bắt đầu tính thời gian chờ đối soát.

### 4.5 Cơ chế đối soát doanh thu (Settlement)

- **Hoa hồng nền tảng**: 10% tính trên tiền hàng subtotal của đơn seller.
- **Tiền chuyển khoản cho seller**: `Payout = Subtotal − Hoa hồng (10%)`. (Phí ship do nền tảng thu và thanh toán cho hãng vận chuyển).
- **Thời gian giữ tiền (Hold)**: Mặc định **7 ngày** kể từ khi đơn giao thành công (`DELIVERED`) để xử lý các yêu cầu đổi trả/khiếu nại nếu có.
- **Thanh toán**: Sau thời gian hold, đơn tự động đủ điều kiện đối soát. Admin sẽ tạo kỳ đối soát và thực hiện chuyển khoản vào tài khoản ngân hàng shop đã đăng ký tại `/brand/settings`.

---

## 5. Vai trò ADMIN

### 5.1 Mục đích

Vận hành và quản trị toàn bộ nền tảng: giám sát đơn hàng, tạo và quyết toán kỳ đối soát seller, quản lý xét duyệt bài đăng nhận thưởng, kiểm duyệt đánh giá sản phẩm, quản lý gói cước consumer Pro, duyệt thương hiệu/sản phẩm, cấu hình rules AI và giám sát kỹ thuật.

### 5.2 Truy cập portal

1. Mở **`{BASE_URL}/admin/login`**
2. Đăng nhập `admin@fitme.ai` (hoặc tài khoản ADMIN khác)
3. Middleware FE chặn `/admin/*` nếu cookie ≠ `ADMIN`

### 5.3 Các màn hình portal

| Đường dẫn | Chức năng |
|-----------|-----------|
| `/admin/dashboard` | Tổng quan hệ thống |
| `/admin/orders` | Giám sát toàn bộ đơn hàng thương mại trên hệ thống |
| `/admin/orders/{id}` | Xem chi tiết đơn khách, đơn seller con và vận đơn |
| `/admin/settlements` | Quản lý các kỳ đối soát doanh thu seller, tạo kỳ đối soát mới và đánh dấu đã thanh toán |
| `/admin/rewards` | Quản lý & duyệt danh sách link chia sẻ nhận thưởng Fitken |
| `/admin/reviews` | Quản lý & kiểm duyệt đánh giá sản phẩm của người dùng |
| `/admin/billing/plans` | Quản lý danh mục gói cước consumer FitMe Pro |
| `/admin/brands` | Duyệt / quản lý brand (PENDING → APPROVED) |
| `/admin/products/moderation` | Duyệt sản phẩm PENDING_REVIEW |
| `/admin/flagged-links` | Link mua bị báo lỗi |
| `/admin/rules/styles` | Rule phong cách (StyleRule) |
| `/admin/rules/occasions` | Rule hoàn cảnh (OccasionRule) |
| `/admin/analytics` | Analytics toàn hệ thống |
| `/admin/privacy` | Consent & yêu cầu xóa dữ liệu |
| `/admin/try-on-monitoring` | Giám sát try-on / preview thất bại |

### 5.4 Quy trình duyệt brand mới

1. USER gửi đơn tại `/brand/onboarding`
2. Admin vào `/admin/brands` → tìm brand **PENDING** → **Duyệt**
3. Hệ thống nâng role user thành `BRAND_OWNER`
4. User **phải đăng xuất và đăng nhập lại** mới vào được `/brand/dashboard`

### 5.5 Checklist test ADMIN

| # | Kịch bản | Lệnh Playwright |
|---|----------|-----------------|
| 1 | Smoke tất cả trang admin | `npx playwright test e2e/role-flows.spec.ts -g "Luồng ADMIN"` |
| 2 | Duyệt SP pending | `-g "duyệt sản phẩm pending"` |
| 3 | Duyệt brand + luồng liên role | `-g "Brand application"` |
| 4 | Admin flows đầy đủ | `npx playwright test e2e/admin-full.spec.ts` |

**Test thủ công:** login admin → `/admin/products/moderation` → **Duyệt** sản phẩm pending → kiểm tra SP hiện trên `/discover`.

---

## 6. Luồng liên role (end-to-end)

Kịch bản đặc biệt — mô phỏng onboarding brand thực tế:

```
USER đăng ký mới
  → /brand/onboarding (gửi đơn)
  → /brand/pending
ADMIN duyệt brand
  → USER đăng nhập /brand/login
  → /brand/dashboard
```

**Chạy tự động:**

```powershell
cd frontend
npx playwright test e2e/role-flows.spec.ts -g "Brand application" --workers=1
```

---

## 7. Chạy test toàn hệ thống

### 7.1 Theo lớp

```powershell
# Tất cả (BE unit + FE unit + E2E từng spec)
.\scripts\test-flows.ps1

# Chỉ E2E (cần FE :3000 + BE :8080)
.\scripts\test-flows.ps1 -E2eOnly

# Chỉ unit
.\scripts\test-flows.ps1 -SkipE2e
```

```bash
# Linux/macOS E2E CI-style
bash scripts/ci-e2e.sh
```

### 7.2 Bảng map spec E2E ↔ luồng

| Spec file | Phạm vi |
|-----------|---------|
| `smoke-routes.spec.ts` | Mọi route public load đúng heading |
| `navigation.spec.ts` | Header, footer, logo, quick search |
| `mobile-nav.spec.ts` | Bottom nav mobile (iPhone 13 viewport) |
| `auth-pages.spec.ts` | Trang auth render |
| `auth-flow.spec.ts` | Login, logout, forgot password |
| `rbac.spec.ts` | Guard brand/admin |
| `discover.spec.ts` | Discover + filter |
| `consultation-anonymous.spec.ts` | AI wizard ẩn danh |
| `product-advice.spec.ts` | Tư vấn từ sản phẩm |
| `photo-preview.spec.ts` | Upload ảnh preview |
| `ai-extras.spec.ts` | Trang AI phụ |
| `try-on.spec.ts` | Try-on chính |
| `try-on-extras.spec.ts` | Try-on phụ (size/form/color…) |
| `wardrobe.spec.ts` | Thêm item tủ đồ |
| `saved-outfits.spec.ts` | Danh sách đã lưu |
| `redirect-flow.spec.ts` | Luồng mua/redirect |
| `brand-portal.spec.ts` | Brand smoke |
| `brand-full.spec.ts` | Brand CRUD |
| `admin-portal.spec.ts` | Admin smoke |
| `admin-full.spec.ts` | Admin duyệt/flag |
| `role-flows.spec.ts` | **3 role serial** — file quan trọng nhất |
| `reset-password.spec.ts` | Reset password (cần env test) |

### 7.3 Kết quả regression gần nhất

| Lớp | Kết quả |
|-----|---------|
| Backend `mvn test` | 63 pass |
| Frontend Vitest | 43 pass |
| E2E Playwright | 102 pass, 1 skip |

**Skip:** `reset-password.spec.ts` — cần backend `FITME_TEST_EXPOSE_RESET_TOKENS=true`.

### 7.4 CI GitHub Actions

Mỗi push/PR chạy: backend test → frontend unit → build → E2E (`smoke-routes` + `role-flows`).

Badge: https://github.com/KhangNT04/fitme_ai_mvp/actions

---

## 8. FAQ vận hành

**Q: Tôi được cấp link deploy — vào đâu để đăng nhập Brand/Admin?**  
A: User → `{BASE_URL}/auth/login` · Brand → `{BASE_URL}/brand/login` · Admin → `{BASE_URL}/admin/login`. Xem bảng mục [1.2](#12-bảng-đường-dẫn-chính-3-vai-trò).

**Q: Link Vercel mở chậm hoặc báo lỗi API lần đầu?**  
A: Backend Render free tier **ngủ** sau ~15 phút không dùng. Đợi 30–60 giây, refresh trang. Lần sau sẽ nhanh hơn.

**Q: Staging VPS — đồng nghiệp không vào được `{BASE_URL}`?**  
A: Kiểm tra firewall đã mở port **3000**; dùng đúng IP trong `PUBLIC_APP_URL`; cùng mạng LAN nếu IP nội bộ.

**Q: Đăng nhập brand nhưng bị đá về `/brand/login`?**  
A: Kiểm tra admin đã duyệt brand chưa; sau khi duyệt phải **logout + login lại** để refresh JWT và cookie `fitme-role`.

**Q: Discover không có sản phẩm?**  
A: Cần sản phẩm trạng thái `ACTIVE` (admin duyệt). Seed tạo sẵn nếu DB trống.

**Q: API lỗi CORS trên bản deploy?**  
A: Admin phải cấu hình `CORS_ORIGINS` trên backend **khớp chính xác** `{BASE_URL}` (https/http, domain, port). User thường không cần sửa — gọi API qua `{BASE_URL}/api/v1` (proxy cùng domain).

**Q: API lỗi CORS trên local?**  
A: Backend `CORS_ORIGINS` phải gồm `http://localhost:3000`.

**Q: Quên mật khẩu không nhận email?**  
A: MVP dùng mock — token hiện trên màn hình forgot-password hoặc log backend `[MOCK] Password reset token`.

**Q: Middleware chặn portal nhưng API vẫn gọi được?**  
A: FE middleware chỉ guard route; BE vẫn validate JWT role (`BRAND_OWNER` / `ADMIN`) trên `/api/v1/brand/**` và `/api/v1/admin/**`.

---

## 9. Tài liệu liên quan

- [DEPLOY_VERCEL_RENDER_NEON.md](DEPLOY_VERCEL_RENDER_NEON.md) — deploy cloud (link public)
- [DEPLOY_TEST.md](DEPLOY_TEST.md) — deploy staging VPS/Docker

- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) — chi tiết kỹ thuật cho dev
- [ARCHITECTURE.md](ARCHITECTURE.md) — sơ đồ kiến trúc
- [API_CONTRACT.md](API_CONTRACT.md) — mapping FE ↔ BE
- [QA_REPORT.md](QA_REPORT.md) — báo cáo QA chi tiết
- [DEPLOY_TEST.md](DEPLOY_TEST.md) — deploy staging
