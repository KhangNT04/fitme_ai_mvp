# Dữ liệu demo cho cộng đồng (Community demo dataset)

## Vì sao cần

Backend production đã có API community kể từ commit `b36a419`
("community posts, self-service account deletion, email change and pricing visibility").
Backend chính chạy trên **Oracle Cloud** (xem [`DEPLOY_ORACLE_CLOUD.md`](./DEPLOY_ORACLE_CLOUD.md)).
Nếu frontend được deploy **trước khi** Oracle deploy lại backend, các trang sau sẽ lỗi:

| Trang | Lỗi | Nguyên nhân |
|---|---|---|
| `/community` | 403 | Route chưa có trong build backend cũ |
| `/outfit/<code>` | 403 / lỗi | `GET /community/posts/{shareCode}` chưa tồn tại |
| `/pricing` | 403 | `GET /pricing/visibility` chưa tồn tại |
| `/profile` | 404 | `GET /me/profile-summary` chưa tồn tại |

Lớp demo data giải quyết đúng cửa sổ này: frontend có dữ liệu để demo **trong lúc chờ backend deploy**.

## Nguyên tắc

1. **Mặc định tắt.** Chỉ bật khi build bản demo với `NEXT_PUBLIC_DEMO_DATA=1`.
2. **Không bao giờ giả lập thao tác ghi.** Đăng bài, theo dõi vẫn gọi API thật. Một bản demo không được giả vờ rằng người dùng đã đăng outfit.
3. **Chỉ thay thế request lỗi.** API còn sống thì dữ liệu thật luôn thắng — deploy lại backend là feed tự quay về dữ liệu thật, không cần rebuild frontend.
4. **Ảnh và sản phẩm là thật.** Mọi ảnh trong dataset là ảnh sản phẩm thật trên Cloudflare R2 (`catalog-media`), mọi `productId` / tên / giá lấy từ `GET /api/v1/products` của production. Không dùng ảnh placeholder, không bịa giá.
5. **Có nhãn.** Bài demo gắn badge "Demo" trên card và "Dữ liệu demo" ở trang chi tiết, để không ai nhầm là dữ liệu người dùng thật.

## Bật/tắt

### Khi build

```bash
# bản demo
NEXT_PUBLIC_DEMO_DATA=1 npm run build

# bản production — không có demo data
npm run build
```

### Khi chạy (không cần rebuild)

Ở trang `/community` có nút chuyển **Dữ liệu thật / Dữ liệu demo**. Nút chỉ xuất hiện khi build đã bật `NEXT_PUBLIC_DEMO_DATA=1`.
Trạng thái lưu ở `localStorage` key `fitme_demo_data`, nên có thể đổi qua lại trong lúc demo mà không cần restart.

## Cấu trúc

| File | Vai trò |
|---|---|
| `frontend/src/lib/demo-data.ts` | Cờ bật/tắt + đọc/ghi `localStorage` |
| `frontend/src/lib/demo-community-data.ts` | Dataset 18 bài (sinh ra, không sửa tay) |
| `frontend/src/lib/demo-community-store.ts` | State cục bộ: like, save, feed, profile |
| `frontend/src/services/community-api.ts` | Bọc `withDemoFallback` cho các lệnh đọc |
| `scripts/gen-demo-community.cjs` | Sinh lại dataset từ snapshot catalog |
| `scripts/demo-community-catalog.json` | Snapshot 40 sản phẩm lấy từ production |
| `scripts/seed-community-posts.cjs` | Ghi 18 bài demo vào DB production (tài khoản demo riêng) |

## Nạp dữ liệu demo vào database

`/community` có dữ liệu thật ngay khi DB có bài đăng. Script dưới đây ghi 18 bài demo (sản phẩm thật, ảnh R2 thật) vào `community_posts`:

```bash
DB_URL="jdbc:postgresql://<neon-host>/neondb?sslmode=require" \
DB_USERNAME=<user> DB_PASSWORD=<password> \
node scripts/seed-community-posts.cjs
```

Tác giả là các tài khoản demo riêng (`demo.*@fitme.ai`, mật khẩu `FitMeDemo@2026`), **không** gán bài cho tài khoản người dùng thật. Chạy lại script là an toàn — bài đã có share code sẽ được bỏ qua.

## Sinh lại dataset

```bash
# 1. cập nhật snapshot catalog từ production
curl -s https://213-35-112-238.sslip.io/api/v1/products -o /tmp/products.json

# 2. chỉnh mảng `specs` trong scripts/gen-demo-community.cjs
#    (mỗi mục: tên tác giả, tiêu đề, caption, style, occasion, index sản phẩm,
#     số like / comment / view, số giờ trước khi đăng)

# 3. sinh lại
node scripts/gen-demo-community.cjs
```

Vài quy tắc khi viết caption để không bị "AI slop":

- Viết như người dùng thật đang nhận xét về **bộ đồ đang mặc**, không mô tả tính năng app.
- Nêu một chi tiết cụ thể về cách mặc / chất liệu / dáng ("rộng hơn dáng thật", "chụp buổi tối nên ảnh hơi tối").
- Không dùng emoji, không "styling tips!", không "must-have", không hashtag trong caption.
- Caption ngắn: 1–2 câu.

## Kiểm thử

```bash
cd frontend
npx vitest run src/lib/demo-community-store.test.ts
npm test          # toàn bộ suite
```

## Sau khi backend đã deploy

Không cần làm gì. `withDemoFallback` chỉ dùng dataset khi request thật thất bại, nên feed tự chuyển sang dữ liệu thật. Nếu muốn gỡ hẳn, xóa:

- `frontend/src/lib/demo-data.ts`, `demo-community-data.ts`, `demo-community-store.ts`
- khối `withDemoFallback` trong `frontend/src/services/community-api.ts`
- nút chuyển trong `frontend/src/app/community/page.tsx`
- badge demo trong `frontend/src/app/community/page.tsx` và `frontend/src/app/outfit/[shareCode]/page.tsx`
