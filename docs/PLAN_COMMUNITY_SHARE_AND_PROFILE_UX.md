# FitMe — Kế hoạch phát triển: Chia sẻ outfit / Cộng đồng thời trang & Cải thiện UX/UI trang Hồ sơ

> Ngày lập: 23/10/2026
> Trạng thái: **Phase A1 + B1 đã triển khai** (xem mục 6 — Nhật ký triển khai). Các phase còn lại (A2, B2) vẫn là đề xuất.
> Bối cảnh: MVP đã chạy prod (Vercel + Render + Neon + R2), 35 migration Flyway, ~430 test backend / ~290 test frontend, 22 file E2E.
> Ràng buộc: nhóm làm 2–3 việc/tuần, 4–6 giờ/tuần (theo `docs/DEVELOPMENT_TIMELINE_SOFTWARE.md`).

---

## 0. Tóm tắt điều tra hiện trạng

### 0.1 Luồng "chia sẻ" đang tồn tại như thế nào

| Mảnh | Hiện trạng |
|---|---|
| Lưu ảnh try-on | `POST /try-on/requests/{id}/save` → `try_on_requests.saved = true` → `GalleryService.recordTryOn()` ghi vào bảng `outfit_gallery_images` |
| Xem thư viện | `GET /api/v1/me/gallery` (phân trang) → trang `/profile/gallery` |
| Chia sẻ ra ngoài | Chỉ dùng **Web Share API** (`navigator.share` với file) hoặc tải ảnh về máy. Không có link công khai, không có permalink |
| Nhận thưởng | Người dùng **tự dán link bài đăng MXH** vào `/rewards` → `POST /api/v1/rewards/share` → validate bằng `ShareUrlPolicy` (chỉ Facebook/TikTok/Instagram/Threads/X, https, có path) → cộng 3 Fitken/ngày (tối đa 1 lần/ngày) |
| Kiểm duyệt | Admin `POST /admin/rewards/shares/{id}/reject` (đã cộng thưởng trước, admin thu hồi sau) |
| UGC hiện có | `product_reviews` + `product_review_images` (đánh giá sản phẩm kèm ảnh, có vote "helpful", admin hide) — **chưa có feed cộng đồng** |

**Khoảng trống cốt lõi**: ảnh try-on của user là **dữ liệu riêng tư**, không có đường dẫn công khai, không có khái niệm "outfit được chia sẻ", không có tương tác cộng đồng (like, lưu, bình luận, follow). Người dùng phải tự chụp ảnh màn hình rồi dán link — friction rất cao và không đo lường được.

### 0.2 Trang Hồ sơ đang ở trạng thái nào

Trang `/profile` (`frontend/src/app/profile/page.tsx`) hiện là một **hub liên kết dạng lưới 3 cột** + 3 khối thông tin:

- Card avatar (initials, tên, email, badge vai trò / Fitken / gói / chỉ số cơ thể)
- Lưới 9 link tới các trang con: Nhận thưởng, Thư viện ảnh, Tủ chi tiêu, Tủ đồ, Brand yêu thích, Gói cước, Đã lưu, Quyền riêng tư, Đổi mật khẩu
- Section "Hồ sơ cơ thể" (chiều cao, cân nặng, tuổi, giới tính, form, tông da, mục tiêu)
- Section "Số đo chi tiết" (ngực, eo, hông, vai, sườn trong)
- Section "Thông tin tài khoản" (họ tên, email, vai trò)

**Vấn đề UX/UI phát hiện được**:

| # | Vấn đề | Mức độ |
|---|---|---|
| P1 | Lưới 9 link phẳng, không có phân cấp — người dùng không biết "Vì sao" tôi vào đây. Không có bất kỳ số liệu nào (số ảnh, số outfit đã lưu, số đồ trong tủ) | Cao |
| P2 | Không có "hành trình tiếp theo" — thiếu hồ sơ cơ thể thì chỉ có 1 CTA, nhưng các trang khác (thư viện rỗng, tủ đồ rỗng, brand yêu thích) không có trạng thái empty dẫn dẫn | Cao |
| P3 | Dữ liệu tài khoản (họ tên/email/vai trò) bị trùng lặp với card avatar ở trên → thông tin lặp, mất không gian | Trung bình |
| P4 | Không có tiến trình hồ sơ ("Hồ sơ của bạn đã đầy 60%") → không biết còn thiếu gì | Cao |
| P5 | Mật khẩu & quyền riêng tư nằm chung hàng với "Nhận thưởng" — nhóm "bảo mật" lẫn vào nhóm "tiện ích" | Trung bình |
| P6 | Không có 2FA cho user thường (`TwoFactorCard` chỉ dùng ở `/admin/account`) dù backend đã có `TwoFactorController` | Trung bình |
| P7 | Không cho đổi tên hiển thị tại chỗ, không có avatar thật (chỉ initials) | Thấp |
| P8 | Không có tổng quan "hoạt động của tôi" (số lần thử đồ, ngày điểm danh liên tiếp, số Fitken kiếm được) | Trung bình |
| P9 | Trang là 1 cột dài, không có tab → không có "cái nhìn tổng quan" | Trung bình |

---

## 1. Mục tiêu sản phẩm

### Luồng A — Chia sẻ outfit & Cộng đồng thời trang

1. **Permalink công khai**: mỗi ảnh try-on (và outfit AI) có 1 link công khai `/outfit/{shareId}` — có OG image để share đẹp trên Facebook/TikTok/Instagram.
2. **Share 1 chạm**: nút "Chia sẻ" sinh link + ảnh → copy link, share qua Web Share API, hoặc copy ảnh kèm caption sẵn có watermark FitMe.
3. **Cộng đồng**: trang `/community` — feed các outfit được chia sẻ công khai, lọc theo brand/style/occasion, tương tác like + lưu.
4. **Tích hợp Fitken**: hành động chia sẻ được thưởng Fitken tự động (bỏ bước dán link thủ công), nhưng **vẫn giữ đường dán link cũ** để không phá luồng đang chạy.
5. **Đo lường**: admin xem số outfit đã chia sẻ, lượt xem, lượt like → báo cáo tăng trưởng.

### Luồng B — Cải thiện UX/UI trang Hồ sơ

1. **Hồ sơ có cấu trúc**: chia thành 3 nhóm rõ ràng — *Tổng quan*, *Sở thích & phong cách*, *Tài khoản & bảo mật*.
2. **Tiến trình hồ sơ**: thanh tiến trình + CTA "Hoàn thiện hồ sơ" dẫn tới bước còn thiếu có giá trị cao nhất (hồ sơ cơ thể → brand yêu thích → ảnh đầu tiên).
3. **Số liệu thật**: số ảnh thư viện, số outfit đã lưu, số đồ tủ, chuỗi điểm danh, Fitken tháng này.
4. **Trạng thái empty có dẫn dẫn**: mỗi ô trống đều có CTA cụ thể.
5. **Chỉnh sửa tại chỗ**: đổi tên hiển thị ngay trên trang, không phải vào trang riêng.
6. **2FA cho user** + đưa bảo mật về đúng nhóm.

---

## 2. Ràng buộc kỹ thuật quan trọng

| Ràng buộc | Ảnh hưởng tới kế hoạch |
|---|---|
| Flyway `ddl-auto: validate` | **Bắt buộc** có file `V38__*.sql` trước khi deploy, không được đổi entity mà thiếu migration |
| `StorageService` (Local/R2) + `StoredMediaPaths` | Ảnh chia sẻ dùng chung đường dẫn `/uploads/...`; ảnh công khai vẫn nằm trên R2 |
| `ImageUploadValidator` giới hạn 5MB, JPG/PNG/WEBP | Share card phải resize ảnh, không upload bản gốc lên feed |
| `ApiResponse<T>` envelope + `errorCode` chuẩn | Mọi endpoint mới phải trả đúng envelope; lỗi nghiệp vụ dùng `BusinessException` |
| `OwnershipChecker` + `RequestContext` | Endpoint cộng đồng phải chặn rò rỉ dữ liệu user: **không** trả `userId` của người đăng |
| `ConsentType` enum | Thêm `COMMUNITY_SHARE` cần migration cả enum lẫn bảng consent |
| `GalleryService.purgeForUser()` được gọi từ `UserDataEraser` | Xóa dữ liệu cá nhân phải xoá luôn bài đã chia sẻ + file trên R2 |
| Modular monolith — `ARCHITECTURE_REVIEW_PHAN_3.md` cảnh báo 8 cặp module phụ thuộc 2 chiều | Package mới phải **chỉ gọi xuống**, không được để `gallery` ↔ `community` gọi lẫn nhau |
| `ShareUrlPolicy` — chỉ 7 domain được phép | Nếu bỏ bước dán link, giữ nguyên policy cho đường cũ |
| Mobile-first, `MobileBottomNav` 5 tab + FAB | Trang cộng đồng mới **không** thêm tab (tràn); dùng lối vào từ Discover/Thư viện |
| `design-tokens.ts` + `surface-card` | Mọi class mới phải dùng token, không hardcode màu |
| Tiếng Việt 100% | Toàn bộ copy mới bằng tiếng Việt |

---

## 3. Kế hoạch triển khai — Luồng A (Cộng đồng & chia sẻ)

### Phase A1 — Nền tảng dữ liệu (2 tuần)

**Mục tiêu**: có permalink + bài đăng cộng đồng, chưa có feed.

#### A1.1 Migration `V38__community_posts.sql`

```sql
-- Bài đăng cộng đồng: ảnh try-on / outfit AI được chủ động chia sẻ công khai
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    gallery_image_id UUID REFERENCES outfit_gallery_images(id) ON DELETE SET NULL,
    try_on_request_id UUID,
    recommendation_id UUID,
    share_code VARCHAR(24) NOT NULL UNIQUE,          -- dùng trong URL /outfit/{shareCode}
    title VARCHAR(200),
    caption TEXT,
    style_label VARCHAR(60),
    occasion VARCHAR(60),
    brand_ids TEXT,                                    -- danh sách brand id, phân tách dấu phẩy
    product_ids TEXT,                                  -- snapshot sản phẩm tại thời điểm chia sẻ
    image_url TEXT NOT NULL,
    visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC',  -- PUBLIC | HIDDEN | REMOVED
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_posts_created ON community_posts(visibility, created_at DESC);
CREATE INDEX idx_community_posts_user ON community_posts(user_id);
CREATE INDEX idx_community_posts_brand ON community_posts(brand_ids);

-- Người dùng lưu bài cộng đồng (bookmark khác "Đã lưu" outfit của chính mình)
CREATE TABLE community_post_saves (
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- Theo dõi tác giả
CREATE TABLE community_follows (
    follower_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
);
```

#### A1.2 Thêm consent

- `ConsentType` thêm `COMMUNITY_SHARE` (migration `V39` hoặc gộp vào `V38`).
- Bắt buộc có consent này mới được chia sẻ công khai — hiện `PrivacyController` đã có sẵn `POST /privacy/consent`.

#### A1.3 Backend package `community`

```
backend/src/main/java/com/fitme/community/
├── controller/
│   ├── CommunityController.java      # GET /community/posts (public feed), GET /community/posts/{shareCode}
│   ├── CommunityInteractionController.java  # POST/DELETE like, save, follow
│   └── AdminCommunityController.java # duyệt/ẩn bài, thống kê
├── dto/
├── entity/  CommunityPost, CommunityPostSave, CommunityFollow
├── repository/
└── service/  CommunityService, CommunityPostAssembler
```

**Quy tắc phụ thuộc module** (tránh phá vỡ modular monolith):
- `community` chỉ đọc `gallery` (qua `GalleryService`) và `product` (qua `ProductService`) — **không** gọi ngược lại.
- `gallery` không biết gì về `community`.
- Xóa dữ liệu cá nhân: `UserDataEraser` gọi thêm `CommunityService.purgeForUser()`.

#### A1.4 API mới

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/community/posts` | User | Tạo bài từ galleryImageId / tryOnRequestId / recommendationId. Yêu cầu consent `COMMUNITY_SHARE` |
| `GET` | `/api/v1/community/posts` | Public | Feed phân trang, filter `brandId`, `style`, `occasion`, `sort=latest|popular` |
| `GET` | `/api/v1/community/posts/{shareCode}` | Public | Chi tiết bài (không trả email/userId) |
| `DELETE` | `/api/v1/community/posts/{id}` | Owner | Gỡ bài của mình |
| `POST`/`DELETE` | `/api/v1/community/posts/{id}/like` | User | Like / unlike |
| `POST`/`DELETE` | `/api/v1/community/posts/{id}/save` | User | Lưu bài |
| `POST`/`DELETE` | `/api/v1/community/users/{id}/follow` | User | Follow / unfollow |
| `GET` | `/api/v1/me/community/saves` | User | Bài đã lưu (đưa vào trang `/saved-outfits` tab mới) |
| `GET` | `/api/v1/community/me` | User | Hồ sơ cộng đồng của tôi (bài đã đăng, số người theo dõi) |
| `GET` | `/api/v1/admin/community/stats` | Admin | Tổng bài, bài 7 ngày, người đăng, tổng like |

**DTO công khai** phải cắt PII: trả `authorDisplayName` (ẩn email), `authorInitials`, `authorAvatarUrl` — không trả `userId` cho người xem khác.

#### A1.5 Frontend

| File | Nội dung |
|---|---|
| `frontend/src/services/community-api.ts` | Client mới, theo mẫu `gallery-api.ts` |
| `frontend/src/types/community.ts` | Kiểu dữ liệu |
| `frontend/src/app/outfit/[shareCode]/page.tsx` | Trang permalink công khai — **SSG-friendly**, có `generateMetadata` cho OG tags |
| `frontend/src/components/community/CommunityPostCard.tsx` | Card bài đăng (ảnh, tác giả, brand, sản phẩm, like/save) |
| `frontend/src/components/community/CommunityShareButton.tsx` | Nút chia sẻ: copy link / share API / copy caption |
| `frontend/src/app/community/page.tsx` | Trang feed (đưa vào Phase A2) |
| `frontend/src/app/profile/gallery/page.tsx` | Thêm nút "Chia sẻ công khai" trong lightbox |

#### A1.6 Share card (OG image)

- Endpoint `GET /api/v1/community/posts/{shareCode}/og-image` trả PNG 1200×630 (ảnh + logo + tên brand).
- Có thể dùng `satori`/`@vercel/og` ở Next.js route handler, hoặc dựng SVG rồi chuyển PNG.
- Nếu chưa làm được ở A1, dùng `imageUrl` gốc làm OG image (fallback) — **không chặn tiến độ**.

#### A1.7 Test

- Backend: `CommunityServiceTest` (tạo bài, quyền sở hữu, không rò PII, xóa dữ liệu cá nhân), `CommunityControllerTest`.
- Frontend: `community-share.test.ts` (sinh link, caption), `community-permalink.test.tsx`.
- E2E: `frontend/e2e/community.spec.ts` — đăng bài → mở permalink → like → save.

---

### Phase A2 — Feed & tương tác (2 tuần)

#### A2.1 Trang feed `/community`

- Grid 2 cột mobile / 3–4 cột desktop, dùng `catalogProductGridClass` cho nhất quán.
- Bộ lọc: brand (chip), style, occasion; sắp xếp "Mới nhất" / "Được yêu thích".
- Phân trang nút "Xem thêm" (như `gallery` dùng `useInfiniteQuery`).
- Trạng thái empty dùng `EmptyState` chung.

#### A2.2 Lối vào

- Không thêm tab vào `MobileBottomNav` (đã đủ 5 + FAB).
- Lối vào: card "Cộng đồng" trong `/discover`, nút "Xem cộng đồng" trong `/profile/gallery`, banner sau khi chia sẻ lần đầu.
- Có thể thêm vào `Header` desktop dưới dạng link phụ.

#### A2.3 Trang hồ sơ cộng đồng `/community/author/[authorKey]`

- Grid bài đã đăng + số người theo dõi / đang theo dõi.
- Nút Follow/Unfollow.
- **Định danh tác giả**: dùng `community_author_key` — một UUID ngẫu nhiên gán cho mỗi tài khoản (`V44__community_author_key.sql`), **không phải** `user_id`. Nhờ vậy URL hồ sơ có thể chia sẻ mà không lộ id tài khoản hay email, giữ đúng nguyên tắc ẩn danh của module `community`.

#### A2.4 Tương tác

- Like: optimistic update, `POST /community/posts/{id}/like` → cập nhật `like_count` bằng SQL counter (giống `product_reviews.helpful_count` — **entity không được ghi đè** số đếm khi vote thay đổi).
- Save: hạt nhỏ — thêm tab "Cộng đồng" vào `/saved-outfits`.

#### A2.5 Quản lý bài của chính mình (đã triển khai)

- Sửa tiêu đề / mô tả sau khi đăng: `PATCH /community/posts/{postId}` (chỉ sửa phần chữ — ảnh, style, occasion giữ nguyên nên link đã chia sẻ vẫn trỏ đúng outfit).
- Tab "Bài của tôi" ở `/profile` cho xem / sửa / gỡ, kèm link tới hồ sơ cộng đồng công khai của chính mình.
- Tab "Cộng đồng" ở `/saved-outfits` cho bài đã lưu.
- Bộ lọc feed: `GET /community/filters` trả về style / occasion / brand kèm số lượng; các bộ lọc **kết hợp** với nhau.

---

### Phase A3 — Gắn Fitken & đo lường (1–2 tuần)

#### A3.1 Thưởng Fitken tự động (giữ luồng cũ)

**Hiện tại**: user tự dán link MXH → `POST /rewards/share` → cộng 3 Fitken/ngày.

**Cách mới**: khi tạo bài cộng đồng → cộng Fitken ngay, không cần dán link. Nhưng:
- Giữ nguyên `POST /rewards/share` (đường cũ) để không phá luồng đang chạy và không mất thưởng cho user đã dùng.
- `SocialShareClaim` thêm cột `community_post_id` để liên kết claim với bài cộng đồng (`V40`).
- Admin vẫn xem được cả 2 loại claim ở `/admin/rewards`.

#### A3.2 Đo lường

- Analytics events mới: `COMMUNITY_POST_CREATED`, `COMMUNITY_POST_VIEWED`, `COMMUNITY_POST_LIKED`, `COMMUNITY_SHARED`.
- `AnalyticsService.track()` đã có sẵn — chỉ cần gọi thêm.
- Admin: card "Cộng đồng" trong `/admin/dashboard` (số bài, lượt xem, lượt like) + trang `/admin/community` để ẩn bài vi phạm.

#### A3.3 Chống lạm dụng

- Giới hạn số bài/ngày (mặc định 5, cấu hình trong `FitMeProperties`).
- `view_count` chống tăng ảo: đếm 1 lần/người/6 giờ, bỏ qua admin/bot (theo mẫu `SiteTrafficController` đang lọc bot).
- Like: giới hạn 1 like/người/bài (unique constraint).

---

### Phase A4 — Hoàn thiện & vận hành (1 tuần)

- Rate limit endpoint tạo bài (theo IP + user).
- Kiểm tra link `postUrl` cũ vẫn chạy sau khi thêm cột mới (migration không phá dữ liệu cũ).
- Viết `docs/API_CONTRACT.md` cho toàn bộ endpoint mới.
- E2E: `community.spec.ts` mở rộng; `smoke-routes.spec.ts` thêm `/community`, `/outfit/{code}`.

---

## 4. Kế hoạch triển khai — Luồng B (UX/UI trang Hồ sơ)

### Phase B1 — Tái cấu trúc trang Hồ sơ (1–2 tuần)

#### B1.1 Bố cục mới

```
/profile
├── Hero: avatar (initials hoặc ảnh) + tên + badge gói + Fitken
│   └── [Sửa hồ sơ] (mở sheet sửa tên/avatar tại chỗ)
├── Tiến trình hồ sơ  (thanh % + "Hoàn thiện hồ sơ" → bước thiếu quan trọng nhất)
├── Tabs: [Tổng quan] [Sở thích] [Tài khoản]
│
├── Tab Tổng quan
│   ├── Ô "Hồ sơ cơ thể" (giữ nguyên, bổ sung CTA nếu thiếu)
│   ├── Ô "Số đo chi tiết" (gộp vào card hồ sơ cơ thể dạng accordion để giảm chiều dài)
│   ├── Lưới số liệu nhanh: Ảnh thư viện · Outfit đã lưu · Đồ trong tủ · Ngày điểm danh · Fitken tháng này
│   └── Ô "Cộng đồng" (bài đã đăng, người theo dõi) — mới ở A2
│
├── Tab Sở thích
│   ├── Brand yêu thích (→ /profile/style-preferences)
│   ├── Phong cách (style profile — hiện đã bị redirect ở /profile/style)
│   └── Dịch vụ: Tủ đồ · Tủ chi tiêu · Thư viện ảnh · Đã lưu
│
└── Tab Tài khoản
    ├── Gói cước & Fitken (→ /pricing, /rewards)
    ├── Bảo mật: Đổi mật khẩu · 2FA (mới) · Quyền riêng tư
    └── Đăng xuất
```

#### B1.2 Nguyên tắc thiết kế

- Tận dụng `Tabs` component có sẵn (`components/ui/tabs.tsx`) — mobile-first, tab cuộn ngang.
- Giữ `CollapsingPageHeader` + `PageShell` + `consumerPageShellClass` để nhất quán với các trang khác.
- Mọi màu/size lấy từ `design-tokens.ts`; dùng `surface-card`.
- Không thêm phụ thuộc UI mới (đang dùng Tailwind 4 + Radix + lucide).

#### B1.3 Component mới

| Component | Vị trí | Trách nhiệm |
|---|---|---|
| `ProfileHero.tsx` | `components/profile/` | Avatar, tên (sửa tại chỗ), badge, Fitken |
| `ProfileProgressCard.tsx` | `components/profile/` | Thanh tiến trình + CTA bước thiếu |
| `ProfileStatsGrid.tsx` | `components/profile/` | 4–6 ô số liệu có số thật |
| `ProfileOverviewTab.tsx` | `components/profile/` | Tab tổng quan |
| `ProfilePreferencesTab.tsx` | `components/profile/` | Tab sở thích |
| `ProfileSecurityTab.tsx` | `components/profile/` | Tab tài khoản & bảo mật |
| `ProfileEditSheet.tsx` | `components/profile/` | Sheet sửa tên hiển thị tại chỗ |

#### B1.4 Bảng "thiếu gì" (dùng cho tiến trình)

| Bước | Điều kiện hoàn thành | API kiểm tra | Cân nặng |
|---|---|---|---|
| Hồ sơ cơ thể | `hasMinimalBodyProfile(bodyProfile)` | `GET /me/body-profile` | Cao |
| Số đo chi tiết | có ít nhất 1 số đo | cùng API | Thấp |
| Brand yêu thích | `brandIds.length > 0` | `GET /brand-preferences` | Trung bình |
| Ảnh thư viện | ≥ 1 ảnh | `GET /me/gallery?size=1` | Cao |
| Tủ đồ | ≥ 1 món | `GET /wardrobe/items` | Trung bình |
| Đăng nhập email | `emailVerified` | trong `AuthUser` | Cao |
| 2FA | `totpEnabled` | `GET /me/two-factor/status` | Thấp |

`hasMinimalBodyProfile()` đã có sẵn ở `lib/profile-prefill.ts` — tái dùng, viết test cho logic tiến trình.

#### B1.5 Số liệu nhanh — API cần bổ sung

Để lấy số ảnh / số outfit đã lưu / số đồ tủ / chuỗi điểm danh / Fitken tháng này, cần **1 endpoint tổng hợp** thay vì 5 request:

```
GET /api/v1/me/profile-summary
→ { profileCompletion: 0.75, bodyProfileComplete: true, brandPreferencesCount: 3,
    galleryImages: 12, savedOutfits: 4, wardrobeItems: 7, checkinStreak: 5,
    fitkenEarnedThisMonth: 23, communityPosts: 2, communityFollowers: 8,
    emailVerified: true, twoFactorEnabled: false }
```

Backend: `ProfileSummaryService` trong package `userprofile` (đã có sẵn `BodyProfileService`, `StyleProfileService`).
Cần xem xét vòng phụ thuộc: `userprofile` gọi `gallery`/`wardrobe`/`rewards` — chấp nhận được nếu các module đó **không** gọi ngược lại `userprofile` (kiểm tra trước khi code).

---

### Phase B2 — Chi tiết hoá & 2FA (1–2 tuần)

#### B2.1 2FA cho người dùng thường

- Backend `TwoFactorController` đã có. Cần kiểm tra: hiện `TwoFactorStatus.available` ghi "admins only for now" → mở cho USER.
- Frontend: tái dùng `TwoFactorCard` (`components/account/TwoFactorCard.tsx`) trong tab Tài khoản.
- Cần đảm bảo luồng đăng nhập 2FA (`AuthResponse.requiresTwoFactor`) hoạt động cho role USER.

#### B2.2 Sửa tên hiển thị tại chỗ

- Backend: `PATCH /api/v1/me/account` → cập nhật `user_accounts.display_name`.
- Frontend: `ProfileHero` sửa inline → invalidate `["auth-user"]` / refetch store.

#### B2.3 Avatar thật

- Tái dụng `POST /api/v1/reviews/images` pattern (`uploadMultipartFile`) → tạo `POST /api/v1/me/avatar`.
- Lưu vào R2 qua `StorageService`, lưu URL vào `user_accounts.avatar_url` (migration `V41`).
- `AuthUser` thêm `avatarUrl?` → `ProfileHero` hiển thị ảnh, fallback initials.

#### B2.4 Dọn thông tin lặp

- Bỏ section "Thông tin tài khoản" (họ tên/email/vai trò) khỏi tab Tổng quan — chuyển vào tab Tài khoản hoặc hiển thị trong hero.

---

### Phase B3 — Đo lường & A/B (1 tuần)

- GA4 events: `profile_view`, `profile_tab_switched`, `profile_progress_cta_clicked`, `profile_edit_name`.
- Admin › Tăng trưởng: tỉ lệ hoàn thành hồ sơ, tỉ lệ click CTA.
- Bộ hồi quy prod: thêm `frontend/e2e-prod/regression.prod.spec.ts` — vào `/profile`, đổi tab, sửa tên.

---

## 5. Bảng ưu tiên & rủi ro

| Hạng mục | Impact | Effort | Phase | Rủi ro |
|---|---|---|---|---|
| Permalink + bài cộng đồng (A1) | Cao | Cao | A1 | Cần migration + package mới |
| Feed + tương tác (A2) | Cao | Trung bình | A2 | Perf feed, spam |
| Fitken tự động + đo lường (A3) | Trung bình | Trung bình | A3 | Cân bằng thưởng vs spam |
| Tái cấu trúc trang Hồ sơ (B1) | Cao | Trung bình | B1 | Hồi quy E2E |
| 2FA + sửa tên + avatar (B2) | Trung bình | Trung bình | B2 | Ảnh avatar tốn storage |
| OG share card (A1.6) | Trung bình | Thấp | A1 | Phụ thuộc dịch vụ render ảnh |

**Rủi ro cần xử lý trước khi code**:
1. **Phụ thuộc 2 chiều** — `ARCHITECTURE_REVIEW_PHAN_3.md` đã cảnh báo. `community` ↔ `gallery` không được gọi lẫn nhau. Sử dụng interface/port hoặc đọc trực tiếp repository với read-only.
2. **Rò PII trong feed công khai** — bắt buộc DTO cắt `userId`/`email`; có test khẳng định response không chứa PII.
3. **Migration trên prod** — `V38` phải chạy trên Neon có dữ liệu thật (35 migration đã chạy). Tạo branch Neon trước khi chạy (quy trình tuần 6 trong timeline).
4. **Chi phí R2** — ảnh cộng đồng tái dùng ảnh đã có trong R2, không nhân bản. Chỉ OG image mới sinh ra.
5. **Spam/lạm dụng** — cần rate limit + giới hạn bài/ngày ngay từ A1.

---

## 6. Lịch theo tuần (gợi ý, 4–6 giờ/tuần)

| Tuần | Việc | Luồng |
|---|---|---|
| 1 | Migration `V38` + entity + repository `community` | A1 |
| 2 | `CommunityService` + `CommunityController` + test backend | A1 |
| 3 | `community-api.ts` + types + trang `/outfit/[shareCode]` + share button | A1 |
| 4 | Cắt PII test + E2E `community.spec.ts` + cập nhật API_CONTRACT | A1 |
| 5 | Feed `/community` + card + filter + bộ nhớ cache | A2 |
| 6 | Hồ sơ cộng đồng + follow/like/save + tab "Cộng đồng" ở `/saved-outfits` | A2 |
| 7 | Fitken tự động + `community_post_id` ở claim + analytics events | A3 |
| 8 | Admin duyệt bài + thống kê cộng đồng + chống spam | A3/A4 |
| 9 | `GET /me/profile-summary` + service backend + test | B1 |
| 10 | Tái cấu trúc `/profile` (tabs, hero, progress, stats) + component mới | B1 |
| 11 | Trạng thái empty có dẫn dẫn + dọn thông tin lặp + 2FA trong tab Tài khoản | B1/B2 |
| 12 | Sửa tên tại chỗ + avatar thật + OG share card | B2/A1.6 |
| 13 | GA4 events + hồi quy prod + tài liệu | A4/B3 |
| 14 | Buffer, sửa lỗi, hoàn thiện | — |

> Lịch trên là **gợi ý theo nhịp nhóm**. Nếu cần ưu tiên tốc độ, có thể cắt A2 (feed) và làm B1 trước — trang Hồ sơ cải thiện cho giá trị ngay, cộng đồng cần thời gian có nội dung.

---

## 7. Câu hỏi cần chốt trước khi bắt đầu

1. **Phạm vi cộng đồng**: có bình luận (comment) ngay từ đầu, hay chỉ like + save? (Khuyến nghị: **giai đoạn 1 chỉ like + save + follow**, bình luận cần moderation nặng hơn.)
2. **Ai được chia sẻ công khai**: mọi user, hay chỉ Premium? (Khuyến nghị: mọi user, nhưng Premium có hạn mức cao hơn — tạo động lực nâng cấp.)
3. **Ảnh công khai có watermark FitMe?** (Khuyến nghị: có watermark nhỏ ở góc để chống cắp ảnh và tạo brand awareness — dán bằng `sharp` ở backend.)
4. **Có cho phép chia sẻ outfit AI (recommendation) không, hay chỉ ảnh try-on?** (Khuyến nghị: cả hai, nhưng giai đoạn 1 chỉ try-on vì outfit board chưa có ảnh chất lượng.)
5. **Có cần duyệt trước khi hiện công khai?** (Khuyến nghị: **không** — duyệt hậu kiểm bằng admin, giống cách `product_reviews` đang chạy.)
6. **Tên gọi trang**: `/community` (Cộng đồng) hay `/feed` / `/outfits`?

---

## 8. Tài liệu cần cập nhật khi triển khai

- `docs/API_CONTRACT.md` — toàn bộ endpoint `/community/*`
- `docs/DEVELOPER_GUIDE.md` — package mới `community` trong sơ đồ module
- `docs/ARCHITECTURE.md` + `docs/diagrams/*.svg` — thêm module `community`
- `docs/USER_GUIDE.md` — mục "Chia sẻ outfit & Cộng đồng"
- `docs/AI_ROADMAP.md` — đánh dấu cộng đồng như nguồn data flywheel (ưu tiên outfit có nhiều like)
- `docs/DEVELOPMENT_TIMELINE_SOFTWARE.md` — thêm 2 luồng vào tuần 7–13

---

## 9. Nhật ký triển khai (Phase A1 + B1)

> Hoàn tất: A1 (nền tảng dữ liệu + permalink + feed) và B1 (tái cấu trúc trang hồ sơ).

### 9.1 Backend

| Hạng mục | Chi tiết |
|---|---|
| Migration | `V38__community_posts.sql` — `community_posts`, `community_post_likes`, `community_post_saves`, `community_follows` + index feed / popular / user / brand |
| Consent | `ConsentType.COMMUNITY_SHARE` (bảng `consent_records.consent_type` không có CHECK nên không cần migration riêng) |
| Package | `com.fitme.community` — `entity/CommunityPost`, `repository/CommunityPostRepository`, `service/CommunityService`, 4 controller, 5 DTO |
| Phụ thuộc module | `community` chỉ **đọc** `gallery` / `product` / `brand` / `auth`; `gallery` **không** biết `community` (giữ đúng kiến trúc modular monolith) |
| PII | `CommunityPostDto` cố tình **không** có `userId` / `email`; test khẳng định `authorEmail` và `userId` không tồn tại trong response |
| Bộ đếm | Like/save/follow dùng SQL thuần (`JdbcTemplate`) + `ON CONFLICT DO NOTHING`, counter cập nhật bằng `UPDATE ... like_count = like_count + 1` → không bao giờ bị ghi đè bởi entity save |
| Rate limit | `fitme.community.post-daily-limit` (mặc định 5 bài/ngày), `fitme.community.share-base-url` (mặc định `/outfit/`) |
| Quyền | `GET /community/posts/**` và `/community/authors/**` public; phần còn lại của `/community/**` cần đăng nhập; `/admin/community/**` cần `ADMIN` |
| Xoá dữ liệu | `UserDataEraser.erasePhotos()` gọi thêm `CommunityService.purgeForUser()` — gỡ bài, like, save, follow của user |

**API mới** (chi tiết đầy đủ trong `docs/API_CONTRACT.md` mục 4b):

```
POST   /api/v1/community/posts                     (đăng — cần consent COMMUNITY_SHARE)
GET    /api/v1/community/posts                     (feed công khai, phân trang + filter + sort)
GET    /api/v1/community/posts/{shareCode}         (permalink công khai)
GET    /api/v1/community/authors/{authorId}/posts
DELETE /api/v1/community/posts/{postId}            (gỡ bài của mình)
POST|DELETE /api/v1/community/posts/{postId}/like
POST|DELETE /api/v1/community/posts/{postId}/save
POST|DELETE /api/v1/community/users/{followedId}/follow
GET    /api/v1/community/me
GET    /api/v1/me/community/saves
GET    /api/v1/admin/community/stats
DELETE /api/v1/admin/community/posts/{postId}
GET    /api/v1/me/profile-summary                  (luồng B1)
PUT    /api/v1/me/display-name                     (luồng B1 — sửa tên tại chỗ)
```

### 9.2 Frontend

| File | Nội dung |
|---|---|
| `services/community-api.ts` | Client đầy đủ: feed, permalink, đăng, like, save, follow, bài đã lưu, hồ sơ cộng đồng |
| `types/community.ts` | Kiểu dữ liệu công khai (không có `userId` / `email`) |
| `lib/community-share.ts` | `communityShareUrl`, `communityShareCaption`, `copyToClipboard`, `shareCommunityPost` (Web Share API → fallback copy) |
| `lib/profile-progress.ts` | Checklist 5 bước + `profileCompletionPercent` + `nextProfileStep` (logic thuần để test) |
| `app/outfit/[shareCode]/page.tsx` | Trang permalink công khai: ảnh, tác giả, brand, sản phẩm, like/save/chia sẻ, CTA tư vấn AI |
| `app/community/page.tsx` | Feed cộng đồng: lọc Mới nhất / Được yêu thích, phân trang vô hạn, like/save inline, empty state có CTA |
| `components/community/CommunityShareButton.tsx` | Nút "Chia sẻ lên cộng đồng" — xin consent ngay tại chỗ nếu chưa có, sau đó đăng + trả link |
| `components/profile/ProfileHero.tsx` | Header hồ sơ + sửa tên hiển thị tại chỗ (Enter để lưu, Esc để huỷ) |
| `components/profile/ProfileStatsGrid.tsx` | 6 ô số liệu, mỗi ô link tới nơi tương ứng |
| `components/profile/ProfileProgressCard.tsx` | Thanh tiến trình + checklist + CTA "bước tiếp theo" |
| `components/profile/ProfilePreferencesTab.tsx` | Tab "Sở thích": hồ sơ cơ thể, số đo chi tiết, link tới các trang liên quan |
| `components/profile/ProfileAccountTab.tsx` | Tab "Tài khoản": thông tin, gói, mật khẩu, quyền riêng tư, **2FA cho user thường** (`TwoFactorCard`), nâng cấp Premium |
| `app/profile/page.tsx` | Tái cấu trúc: Hero → Stats → Progress → 3 tab (Tổng quan / Sở thích / Tài khoản) |
| `app/profile/gallery/page.tsx` | Thêm khối "Chia sẻ lên cộng đồng" trong lightbox |
| `app/discover/page.tsx` | Thêm lối vào cộng đồng (không thêm tab bottom-nav vì đã đủ 5 tab) |

### 9.3 Kiểm thử

| Loại | Kết quả |
|---|---|
| Backend | `mvn test` → **494 test, 0 fail**. Một lỗi có sẵn từ trước ở `AdminUserManagementIntegrationTest` đã được sửa trong phiên này (xem mục 9.5) |
| Frontend | `vitest run` → **367 test, 0 fail** (gồm `community-share.test.ts` 5 test, `profile-progress.test.ts` 7 test) |
| TypeScript | `tsc --noEmit` sạch |
| ESLint | 0 error trong toàn bộ file của 2 luồng (7 warning còn lại là có sẵn, do React Hook Form `watch()` trong file không liên quan) |
| Build | `next build` thành công, route `/community` và `/outfit/[shareCode]` được đăng ký |

Các test mới kiểm tra những điểm dễ sai nhất:
- Đăng bài **không có consent** → `400 CONSENT_REQUIRED`.
- Đăng ảnh **của người khác** → `400 COMMUNITY_IMAGE_NOT_FOUND`.
- Response công khai **không chứa** `userId` / `authorEmail`.
- Người khác **không xoá được** bài của tôi (`404`).
- Bài đã gỡ **biến mất khỏi feed**.
- Xoá dữ liệu cá nhân **xoá luôn** bài cộng đồng + lượt lưu.
- `completionRatio` và `nextStep` khớp với checklist 5 bước.

### 9.4 Việc còn lại

| Phase | Nội dung | Ưu tiên |
|---|---|---|
| A2 | Tab "Cộng đồng" trong `/saved-outfits`, hồ sơ cộng đồng (danh sách người theo dõi), bình luận | Trung bình |
| A3 | Fitken tự động khi đăng bài cộng đồng + `community_post_id` trong claim + analytics event | Trung bình |
| A4 | OG image cho permalink, watermark ảnh, chống spam nâng cao, GA4 events | Thấp |
| B2 | Avatar thật thay initials, thêm mục "Tủ chi tiêu" vào đúng nhóm, empty state có dẫn dẫn ở từng trang con | Thấp |

### 9.5 Lỗi có sẵn được sửa kèm

`AdminUserManagementIntegrationTest.adminSearchesAccountsAndLockingSignsTheUserOut` fail với `No value at JSON path "$.errorCode"` — **không liên quan tới 2 luồng này**, đã kiểm chứng bằng `git stash` trên cây sạch.

**Nguyên nhân**: `ce54de8` (suspend giết session) set `passwordChangedAt = now()` khi khoá tài khoản, còn `0c728ec` đổi thông báo "Mật khẩu đã được đổi" → "Phiên đăng nhập đã hết hiệu lực". Hai thay đổi này chồng lấn: khi refresh token của tài khoản bị khoá, `refreshToken()` kiểm tra `issuedBeforePasswordChange` **trước** nên ném lỗi chung (không có `errorCode`) thay vì `ACCOUNT_LOCKED`.

**Cách sửa**: trong `AuthService.refreshToken()`, kiểm tra trạng thái tài khoản **trước** kiểm tra đổi mật khẩu:

```java
// A suspended or deleted account must report the lock, not a generic "session expired".
// Suspension also bumps passwordChangedAt, so the status check has to come first.
if (user.getStatus() != UserStatus.ACTIVE) {
    throw new BusinessException(ACCOUNT_LOCKED_MESSAGE, "ACCOUNT_LOCKED");
}
```

Kết quả: 6/6 test trong `AdminUserManagementIntegrationTest` pass, không ảnh hưởng các test auth/session khác.

### 9.6 Test infra: chạy `mvn test` song song an toàn

Khi chạy 2 lần `mvn test` cùng lúc, một lần có thể báo lỗi hàng loạt:

```
InvalidDataAccessResourceUsage ... [ERROR: relation "user_accounts" does not exist]
```

**Nguyên nhân**: `TestDatabaseManager` fallback sang container CLI `fitme-test-postgres` (port `55432`) — **dùng chung cho mọi lần chạy**. `ensureFallbackDatabase()` gọi `docker rm -f` container khi không kết nối được, nên lần chạy sau có thể xoá sạch schema của lần chạy đang chạy.

**Cách sửa**: mỗi lần chạy tạo **database riêng** trong container dùng chung, và tự xoá khi JVM kết thúc:

```java
// TestDatabaseManager.createRunScopedDatabase()
String database = "fitme_test_" + UUID.randomUUID()...;
statement.execute("CREATE DATABASE " + database);
activeDatabaseName = database;
Runtime.getRuntime().addShutdownHook(new Thread(() -> dropDatabase(database), "fitme-test-db-cleanup"));
```

Flyway migrate database riêng từ đầu → không còn tranh chấp schema. Đã xác minh: container chỉ còn lại `fitme_test` sau khi chạy, không tích tụ database rác.

---

## 10. Luồng C — Tự xoá tài khoản của chính mình

### 10.1 Vấn đề

Trước đây người dùng muốn xoá tài khoản phải gửi `POST /privacy/deletion-requests` với
`requestType = ALL`, rồi **chờ admin xử lý thủ công** (`POST /admin/privacy/deletion-requests/{id}/process`).
Không có bước xác nhận mật khẩu, không có mốc thời gian hẹn, và không có cách hủy khi đã lỡ gửi.
Đây là rủi ro tuân thủ GDPR: yêu cầu xoá tài khoản phải có thể tự thực hiện.

### 10.2 Thiết kế

| Quyết định | Lý do |
|---|---|
| **Grace period** (mặc định 7 ngày, chọn được 0/3/7/30) | Cho người dùng cơ hội đổi ý; tránh xoá nhầm do bấm nhầm nút |
| **Xác nhận bằng mật khẩu hiện tại** | Chống xoá tài khoản khi phiên bị chiếm (session hijacking) |
| **Xác nhận bằng cụm `XOA TAI KHOAN`** | Chống xoá nhầm do thao tác vô tình — cố tình gõ sai cụm này rất khó |
| **Tự động, không cần admin** | Đáp ứng yêu cầu "tự xoá" + giảm tải vận hành; admin vẫn có thể xử lý các yêu cầu khác |
| **Dùng lại `UserDataEraser.eraseAll()`** | Một nguồn sự thật duy nhất cho việc xoá dữ liệu (ảnh, tủ đồ, hồ sơ, cộng đồng, brand leads) |
| **Job chạy mỗi giờ** | Không cần cron phức tạp; độ trễ tối đa 1 giờ sau khi hết hạn là chấp nhận được |
| **So sánh hạn bằng `now()` của database** | Tránh lệch múi giờ giữa JVM (Asia/Ho_Chi_Minh) và Postgres (UTC) |
| **Chỉ role `USER`** | Brand/admin có dữ liệu đối tác → vẫn xử lý thủ công (`DELETION_MANUAL_REVIEW`) |

### 10.3 Backend

**Migration `V39__self_service_account_deletion.sql`**

```sql
ALTER TABLE data_deletion_requests
    ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Chặn tạo trùng: một tài khoản chỉ có một yêu cầu đang chờ.
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_deletion_requests_pending_account
    ON data_deletion_requests(user_id)
    WHERE request_type = 'ACCOUNT_DELETION' AND status = 'PENDING';
```

**Enum**

- `DeletionRequestType.ACCOUNT_DELETION` — loại yêu cầu mới (tách khỏi `ALL`).
- `DeletionRequestStatus.CANCELLED` — người dùng đã huỷ trong grace period.

**Class mới**

| File | Vai trò |
|---|---|
| `privacy/service/AccountDeletionService.java` | Đặt lịch / huỷ / đọc trạng thái / thực thi xoá |
| `privacy/service/AccountDeletionJob.java` | `@Scheduled(cron = "0 25 * * * *")` — quét yêu cầu hết hạn và xoá |
| `privacy/controller/AccountDeletionController.java` | `POST /api/v1/me/account-deletion`, `POST /.../cancel`, `GET /api/v1/me/account-deletion` |
| `privacy/dto/DeleteMyAccountRequest.java` | Body: mật khẩu, cụm xác nhận, lý do, số ngày chờ |
| `privacy/dto/AccountDeletionStatusDto.java` | Trạng thái yêu cầu trả về frontend |

**Điểm an toàn**

- `SecurityConfig`: `/api/v1/me/account-deletion/**` yêu cầu đăng nhập (nằm trong nhóm `/me/**`).
- `PrivacyService.processDeletion()`: admin xử lý sớm yêu cầu tự xoá → 400 `DELETION_SELF_SERVICE`.
- `AccountSecurityEvent`: thêm `ACCOUNT_DELETION_SCHEDULED` / `ACCOUNT_DELETION_CANCELLED` → gửi
  email xác nhận cho chủ tài khoản (phát hiện kẻ lạ tự xoá tài khoản).
- `UserDataEraser.eraseAll()` đã sẵn có xoá ảnh, tủ đồ, hồ sơ cơ thể, gu thời trang, lịch sử tư vấn,
  đánh giá, bài đăng cộng đồng, follow/like/save, ẩn danh hoá `brand_leads`, và set
  `user_accounts.status = 'DELETED'` + đổi email thành `deleted-<id>@deleted.fitme.invalid`.

### 10.4 Frontend

**Component `components/privacy/DeleteAccountSection.tsx`** (dùng chung cho tab "Tài khoản" ở
`/profile` và trang `/profile/privacy`):

- Chưa có yêu cầu → thẻ cảnh báo + nút "Xoá tài khoản của tôi".
- Bấm nút → hộp thoại xác nhận: chọn khoảng chờ, nhập mật khẩu (có nút hiện/ẩn), gõ cụm
  `XOA TAI KHOAN`, lý do rời bỏ (tuỳ chọn). Nút xác nhận **disable** cho tới khi đủ mật khẩu + cụm.
- Đang có yêu cầu → banner cảnh báo "Tài khoản sắp được xoá" kèm ngày xoá + nút "Huỷ xoá tài khoản".
- `services/privacy-api.ts`: thêm `accountDeletionApi.requestDeletion / cancelDeletion / getStatus`.

### 10.5 Kiểm thử

| Tầng | File | Số test |
|---|---|---|
| Backend | `privacy/controller/AccountDeletionIntegrationTest.java` | 14 — đặt lịch, lưu lý do, sai mật khẩu, thiếu cụm xác nhận, trùng yêu cầu, huỷ, huỷ rồi đặt lại, không có yêu cầu thì huỷ → 404, brand owner bị từ chối, chưa đăng nhập → 401, hết hạn → xoá thật, yêu cầu đã huỷ không bị job xoá, admin không xử lý sớm được, `executeDeletion` trực tiếp |
| Frontend | `components/privacy/DeleteAccountSection.test.tsx` | 4 — mở hộp thoại, disable nút cho tới khi đủ điều kiện, payload gửi đi, banner chờ + nút huỷ |

### 10.6 Ghi chú kỹ thuật

**Lệch múi giờ khi so sánh hạn.** `grace_period_ends_at` đặt là `TIMESTAMPTZ` (không phải `TIMESTAMP`)
vì cột `TIMESTAMP` không mang múi giờ, còn Hibernate map `Instant` theo UTC và Postgres chạy UTC —
so sánh bằng tham số `Instant` của JVM (Asia/Ho_Chi_Minh) sẽ lệch 7 tiếng và job **không bao giờ**
tìm thấy yêu cầu hết hạn. Vì vậy deadline được so sánh ngay trong database:

```java
@Query(value = """
        SELECT * FROM data_deletion_requests
        WHERE request_type = :requestType AND status = :status
          AND grace_period_ends_at IS NOT NULL AND grace_period_ends_at <= now()
        """, nativeQuery = true)
List<DataDeletionRequest> findDueForExecution(...);
```

**Pool kết nối trong test.** `application-test.yml` giờ giới hạn `hikari.maximum-pool-size: 4`.
Container test chỉ cho phép 100 kết nối, nhiều test class chạy song song mỗi class một pool → chạm
trần `sorry, too many clients already` (lỗi hẳn, không liên quan logic). Giới hạn pool theo test vẫn
đủ vì các test truy cận DB tuần tự.

---

## 11. Nhật ký triển khai — Đổi email đăng nhập & Ẩn gói trả phí

> Hoàn tất cả hai luồng: tự đổi email đăng nhập (2 bước) và cơ chế admin ẩn/hiện gói trả phí.

### 11.1 Đổi email đăng nhập (self-service)

**Migration `V40__change_email_and_plan_visibility.sql`**

```sql
ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS pending_email VARCHAR(320),
    ADD COLUMN IF NOT EXISTS pending_email_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS pending_email_code_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pending_email_requested_at TIMESTAMPTZ;

ALTER TABLE billing_plans
    ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE;
```

**Class mới**

| File | Vai trò |
|---|---|
| `auth/service/AccountEmailChangeService.java` | Bước 1 xác nhận mật khẩu → gửi mã; bước 2 xác minh mã → đổi email + cấp session mới; huỷ yêu cầu |
| `auth/controller/AccountEmailController.java` | `GET /api/v1/me/email`, `POST /api/v1/me/email/request`, `POST /api/v1/me/email/confirm`, `DELETE /api/v1/me/email/pending` |
| `auth/dto/ChangeEmailRequest.java` | Body bước 1: `{ currentPassword, newEmail }` |
| `auth/dto/ConfirmEmailChangeRequest.java` | Body bước 2: `{ code }` |
| `auth/dto/EmailChangeStatusDto.java` | `{ pending, pendingEmail, requestedAt, expiresAt }` |

**Quyết định sản phẩm đã chốt**

- Email cũ **vẫn đăng nhập được** cho tới khi mã 6 chữ số ở email mới được xác nhận → gõ sai email
  không bao giờ khoá tài khoản.
- Email mới được đánh dấu `emailVerified = true` ngay khi xác nhận mã (đã chứng minh quyền sở hữu).
- Yêu cầu mới **ghi đè** yêu cầu cũ; mã cũ mất hiệu lực ngay.
- So sánh mã bằng `MessageDigest.isEqual` (constant-time) để không rò rỉ thông tin qua thời gian.
- Khi đổi thành công: `user_accounts.password_changed_at` được cập nhật để vô hiệu hoá session cũ,
  và phát `AccountSecurityEvent.Kind.EMAIL_CHANGED_BY_USER` → gửi thông báo tới **cả** email cũ và mới.

**Frontend**

- `services/account-email-api.ts` — `getStatus / requestChange / confirmChange / cancelChange`.
- `components/account/ChangeEmailSection.tsx` — nằm trong thẻ "Bảo mật tài khoản" ở `/profile`:
  hiện email hiện tại, banner "đang chờ xác minh" kèm nút huỷ, và hộp thoại 2 bước
  (Mật khẩu + Email mới → Mã xác minh 6 chữ số).

### 11.2 Ẩn gói trả phí (pricing visibility)

**Cơ chế 2 tầng**

| Tầng | Nơi lưu | Ai điều chỉnh |
|---|---|---|
| Toàn cục | system setting `pricing.show_paid` (mặc định `1`) | Admin — công tắc trên trang Quản trị |
| Từng gói | `billing_plans.visible` (mặc định `true`) | Admin — cờ "Hiển thị với người dùng" trong form gói |

Khi cờ toàn cục tắt, **mọi** gói trả phí bị ẩn kể cả gói đang bật `visible = true`.

**Backend**

| File | Vai trò |
|---|---|
| `billing/controller/PricingVisibilityController.java` | `GET /api/v1/pricing/visibility` (public) |
| `billing/controller/AdminPricingVisibilityController.java` | `GET|PUT /api/v1/admin/pricing/visibility` (admin) |
| `billing/service/BillingPlanService.java` | `pricingVisible()` đọc setting; `listActiveConsumerPlans()` lọc theo cờ toàn cục + per-plan |
| `billing/service/ConsumerSubscriptionService.java` | `checkout()` từ chối gói bị ẩn với `PLAN_HIDDEN` |
| `entitlement/service/ConsumerEntitlementService.java` | Không trả `upsellMessage` / `premiumPriceVnd` khi gói đang ẩn |
| `settings/service/SystemSettingsService.java` | Định nghĩa `pricing.show_paid` (min 0, max 1, default 1) + helper `pricingShowPaid()` |

**Quyết định đã chốt**

- Người dùng **đã mua** Premium **không** bị mất quyền khi gói bị ẩn — cờ `visible` chỉ ảnh
  hưởng tín hiệu bán hàng, không thu hồi entitlement.
- Admin tắt cờ toàn cục thì trang `/pricing` vẫn truy cập được nhưng không hiện gói Premium hay
  khối nạp thêm Fitken; hero đổi sang bản "miễn phí".

**Frontend**

- `hooks/use-pricing-visibility.ts` — hook React Query đọc `/api/v1/pricing/visibility`
  (`staleTime` 60s, mặc định `showPaid = true` để mạng chậm không làm ẩn nhầm CTA).
- `components/layout/PricingLink.tsx`, `PricingFooterLink.tsx` — CTA nâng cấp tự ẩn.
- `app/pricing/page.tsx` — ẩn thẻ gói Premium + khối top-up khi `showPaid = false`.
- `components/profile/ProfileAccountTab.tsx` — ẩn dòng "Gói sử dụng" và thẻ "Nâng cấp trải nghiệm".
- `app/admin/billing/plans/page.tsx` — công tắc `PaidVisibilitySwitch` + badge "Hiển thị" / "Đang ẩn".
- `components/admin/BillingPlanForm.tsx` — checkbox "Hiển thị với người dùng".

### 11.3 Kiểm thử

| Tầng | File | Nội dung |
|---|---|---|
| Backend | `auth/controller/AccountEmailChangeIntegrationTest.java` | 10 — đổi email thành công, sai mật khẩu, email trùng, mã sai, mã hết hạn, huỷ yêu cầu, email cũ vẫn đăng nhập được, email mới đã xác minh, session cũ bị vô hiệu hoá |
| Backend | `billing/controller/PricingVisibilityIntegrationTest.java` | 9 — cờ toàn cục, cờ per-plan, checkout bị từ chối, entitlement không còn upsell, người đã mua vẫn giữ quyền |
| Backend | `entitlement/service/ConsumerEntitlementServiceTest.java` | 11 — bổ sung case "gói trả phí đang ẩn" |
| Frontend | `components/account/ChangeEmailSection.test.tsx` | 5 — trạng thái ban đầu, mở hộp thoại, bước 1, bước 2, huỷ |
| Frontend | `components/layout/PricingLink.test.tsx` | 2 — hiện CTA khi cho phép, ẩn CTA khi admin tắt cờ |

Kết quả: backend `mvn test` xanh, frontend `vitest run` **378 test / 74 file** xanh, `tsc --noEmit` 0 lỗi.

