# FitMe AI — FRONTEND DEVELOPMENT GUIDE
## AI Outfit Advisor + AI Try-On Preview + Brand Catalog Connector

> Tài liệu này dùng cho AI/Cursor/Stitch/Frontend Developer đọc trước khi phát triển UI/FE.  
> Mục tiêu: giữ đúng luồng sản phẩm, đúng kiến trúc, không bị lan man scope.

---

## 1. Định vị sản phẩm

FitMe AI là web app thời trang cá nhân hóa giúp người dùng:

1. Biết nên mặc gì theo dáng người, gu, hoàn cảnh.
2. Nhận gợi ý size, form, màu sắc.
3. Xem outfit board hoặc preview outfit 2D bằng AI.
4. Thử sản phẩm bằng AI ở mức minh họa 2D.
5. Bấm mua item còn thiếu qua Shopee/TikTok Shop/website brand.
6. Brand có portal để quản lý catalog và xem analytics tổng hợp.
7. Admin quản lý brand, sản phẩm, link, rule AI, privacy và consent.

**FitMe AI không phải marketplace hoàn chỉnh trong MVP.**  
**FitMe AI không xử lý thanh toán, đơn hàng, vận chuyển, hoàn trả.**

---

## 2. Nguyên tắc UX bắt buộc

### 2.1. Ngôn ngữ sử dụng

Dùng tiếng Việt rõ ràng, thân thiện, không body-shaming.

Dùng các cụm sau nhất quán:

- “Tư vấn size & phối đồ bằng AI”
- “Thử mặc bằng AI”
- “Preview outfit 2D”
- “Ảnh minh họa bằng AI”
- “Gợi ý size”
- “Gợi ý form”
- “Gợi ý màu sắc”
- “So sánh size”
- “So sánh màu”
- “Tạo lại preview”
- “Xóa ảnh của tôi”
- “Chuyển đến nơi bán”

Không dùng:

- “Đảm bảo giống thật 100%”
- “Thay thế thử đồ thật”
- “Phân tích khuyết điểm cơ thể”
- “mập”, “béo”, “lùn”, “xấu”, “bụng to”, “chân ngắn”

Thay bằng:

- “giúp tổng thể cân đối hơn”
- “tạo cảm giác gọn hơn”
- “phù hợp với dáng và gu bạn chọn”
- “thoải mái hơn ở phần eo/bụng”
- “tạo hiệu ứng kéo dài dáng”

### 2.2. Disclaimer bắt buộc

Bất kỳ nơi nào có preview/AI try-on phải hiển thị:

> “Ảnh minh họa bằng AI, dùng để tham khảo. Form thực tế có thể khác tùy chất liệu, bảng size và cách mặc.”

### 2.3. Quyền riêng tư ảnh

Mọi upload ảnh người dùng phải có consent trước khi upload.

Brand không bao giờ được thấy:

- ảnh người dùng
- ảnh wardrobe cá nhân
- số đo cơ thể
- thông tin profile cá nhân
- ảnh preview cá nhân

---

## 3. Stack đề xuất

Nếu chưa có quyết định stack, dùng:

- Framework: Next.js hoặc React + Vite
- Language: TypeScript
- Styling: TailwindCSS
- State management:
  - Auth/session: Zustand hoặc Context
  - Server state: TanStack Query
  - Form: React Hook Form + Zod
- Routing:
  - Next.js App Router nếu dùng Next
  - React Router nếu dùng Vite
- API client: Axios/fetch wrapper
- Chart: Recharts hoặc Tremor
- Upload: drag & drop component
- UI component base: shadcn/ui hoặc custom component system

---

## 4. Kiến trúc thư mục FE đề xuất

```txt
src/
  app/ hoặc routes/
    (public)/
      page-home/
      discover/
      product-detail/
      ai-consultation/
      ai-try-on/
      wardrobe/
      profile/
    auth/
      login/
      register/
      verify-email/
      forgot-password/
    brand/
      dashboard/
      products/
      analytics/
      settings/
    admin/
      dashboard/
      brands/
      products/
      flagged-links/
      rules/
      analytics/
      privacy/
  components/
    common/
    layout/
    product/
    outfit/
    ai/
    upload/
    analytics/
    forms/
    modals/
  features/
    auth/
    user-profile/
    wardrobe/
    product-catalog/
    recommendation/
    try-on/
    brand-portal/
    admin-portal/
  services/
    api-client.ts
    auth-api.ts
    product-api.ts
    recommendation-api.ts
    tryon-api.ts
    brand-api.ts
    admin-api.ts
  stores/
    session-store.ts
    user-profile-store.ts
    tryon-store.ts
  types/
    auth.ts
    user.ts
    product.ts
    outfit.ts
    recommendation.ts
    analytics.ts
  utils/
    format-price.ts
    validators.ts
    constants.ts
```

---

## 5. Phân quyền FE

### 5.1. Public user

Có thể dùng:

- Trang chủ
- Khám phá sản phẩm
- Xem chi tiết sản phẩm
- Tư vấn AI dạng anonymous session
- Xem kết quả
- Redirect mua hàng

### 5.2. Registered user

Có thêm:

- Lưu profile
- Lưu wardrobe
- Lưu outfit
- Lưu preview
- Xóa dữ liệu cá nhân

### 5.3. Brand partner

Có:

- Brand dashboard
- Quản lý sản phẩm
- Xem analytics tổng hợp
- Cập nhật purchase URL
- Cập nhật size/color data

### 5.4. Admin

Có:

- Quản lý brand
- Duyệt sản phẩm
- Duyệt link
- Quản lý rule
- Quản lý privacy/consent
- Xem analytics toàn hệ thống

---

## 6. Route map FE

### 6.1. Public/User routes

```txt
/                         Trang chủ
/discover                 Khám phá sản phẩm
/products/:id             Chi tiết sản phẩm
/ai/start                 Bắt đầu tư vấn AI
/ai/body-profile          Nhập thông tin cơ thể
/ai/style-profile         Chọn gu thời trang
/ai/occasion              Chọn hoàn cảnh/vibe
/wardrobe                 Tủ đồ cá nhân
/ai/photo-upload          Upload ảnh preview 2D
/ai/photo-check           Kiểm tra ảnh
/ai/processing            AI xử lý
/ai/result/:id            Kết quả tư vấn AI
/ai/preview/:id           Kết quả preview 2D
/ai/variants/:id          Thử biến thể size/form/màu
/saved-outfits            Gợi ý đã lưu
/similar-products         Sản phẩm tương tự
/redirect/confirm/:id     Xác nhận chuyển hướng mua
/redirect/loading         Đang chuyển hướng
/profile                  Hồ sơ người dùng
```

### 6.2. AI Try-On routes

```txt
/try-on                   Chọn đồ để thử mặc AI
/try-on/selected          Outfit đang chọn để thử
/try-on/input             Thông tin thử mặc
/try-on/processing        Đang tạo preview thử mặc
/try-on/result/:id        Kết quả thử mặc AI
/try-on/color/:id         Thử màu khác
/try-on/size/:id          Thử size khác
/try-on/form/:id          Thử form khác
/try-on/decision/:id      Quyết định sau khi thử
```

### 6.3. Auth routes

```txt
/auth/login
/auth/register
/auth/verify-email
/auth/forgot-password
```

### 6.4. Brand routes

```txt
/brand/login
/brand/onboarding
/brand/dashboard
/brand/products
/brand/products/new
/brand/products/:id/edit
/brand/products/:id/analytics
/brand/analytics
/brand/analytics/redirect
/brand/analytics/dropoff
/brand/analytics/hesitation
/brand/analytics/try-on
/brand/settings
```

### 6.5. Admin routes

```txt
/admin/login
/admin/dashboard
/admin/brands
/admin/products/moderation
/admin/flagged-links
/admin/rules/styles
/admin/rules/occasions
/admin/analytics
/admin/privacy
/admin/try-on-monitoring
```

---

# 7. Luồng FE chi tiết

## 7.1. Luồng 1 — Tư vấn outfit nhanh

### Mục tiêu

Người dùng không cần đăng nhập vẫn có thể tạo outfit gợi ý.

### Bước UI

1. User vào `/`.
2. Click “Bắt đầu tư vấn outfit”.
3. App gọi API tạo anonymous session nếu chưa có.
4. Chuyển đến `/ai/start`.
5. User nhập body profile ở `/ai/body-profile`.
6. User chọn style ở `/ai/style-profile`.
7. User chọn occasion/vibe ở `/ai/occasion`.
8. User chọn có dùng wardrobe hay không.
9. User có thể bỏ qua upload ảnh.
10. Chuyển đến `/ai/processing`.
11. FE gọi API generate recommendation.
12. Chuyển đến `/ai/result/:id`.
13. User chọn:
    - Lưu gợi ý
    - Xem sản phẩm tương tự
    - Upload ảnh tạo preview
    - Mua ngay

### Trang cần làm

- Home
- AI start
- Body profile
- Style profile
- Occasion/vibe
- Processing
- AI result
- Saved outfits
- Similar products
- Redirect confirm

### State cần giữ

```ts
type ConsultationDraft = {
  sessionId: string;
  selectedProductId?: string;
  bodyProfile: BodyProfile;
  styleProfile: StyleProfile;
  occasionRequest: OccasionRequest;
  wardrobeMode: WardrobeMode;
  budget?: BudgetRange;
  photoUploadId?: string;
};
```

---

## 7.2. Luồng 2 — Chọn sản phẩm rồi tư vấn size/phối đồ

### Mục tiêu

Người dùng đang xem một sản phẩm cụ thể và muốn biết sản phẩm đó có hợp không, nên chọn size/màu/form nào.

### Bước UI

1. User vào `/discover`.
2. Filter/tìm kiếm sản phẩm.
3. Click product card.
4. Vào `/products/:id`.
5. Click “Tư vấn size & phối đồ bằng AI”.
6. App đưa productId vào consultation draft.
7. User nhập body/style/occasion.
8. AI result phải hiển thị:
   - Sản phẩm đã chọn
   - Gợi ý size
   - Gợi ý màu
   - Gợi ý form
   - Cách phối cùng item khác
   - CTA mua sản phẩm

### Trang cần làm

- Product discovery
- Product detail
- AI consultation
- AI result
- Similar products
- Buy redirect

---

## 7.3. Luồng 3 — Upload ảnh để tạo preview 2D

### Mục tiêu

User upload ảnh để AI tạo preview 2D minh họa outfit trên ảnh người dùng.

### Bước UI

1. Từ AI result, user click “Upload ảnh để tạo preview 2D”.
2. Chuyển đến `/ai/photo-upload`.
3. Hiển thị hướng dẫn chụp ảnh.
4. Hiển thị consent checkbox/modal.
5. User đồng ý upload.
6. FE upload file lên backend.
7. Backend trả về `photoUploadId`.
8. Chuyển sang `/ai/photo-check`.
9. Nếu ảnh tốt: user click tiếp tục.
10. Nếu ảnh kém: cho dùng ảnh này hoặc tải ảnh khác.
11. Nếu ảnh lỗi: bắt upload lại.
12. Chuyển `/ai/processing`.
13. FE gọi generate 2D preview.
14. Chuyển `/ai/preview/:id`.

### UI bắt buộc

- Upload area
- Consent modal
- Photo quality card
- Original photo vs preview comparison
- Delete photo button
- Disclaimer visible

### Không được làm

- Không nói preview giống thật 100%.
- Không để brand xem ảnh.
- Không upload nếu chưa consent.

---

## 7.4. Luồng 4 — Thử mặc bằng AI

### Mục tiêu

Người dùng chọn một hoặc nhiều sản phẩm để thử bằng AI, sau đó AI gợi ý size/form/màu.

### Bước UI

1. User vào `/try-on` hoặc click “Thử mặc bằng AI” trên product card.
2. User chọn item:
   - top
   - bottom
   - outerwear
   - shoes/accessory
3. Selected tray hiện item đã chọn.
4. User click “Tiếp tục thử outfit”.
5. Vào `/try-on/selected`.
6. Nếu thiếu item, AI gợi ý bổ sung.
7. User chọn:
   - dùng ảnh cá nhân
   - dùng avatar mẫu
   - chỉ xem outfit board
8. Vào `/try-on/input`.
9. Nhập height, weight, fit preference, skin tone, occasion, desired vibe, size thường mặc.
10. Chuyển processing.
11. Vào `/try-on/result/:id`.
12. Hiển thị:
   - preview thử mặc
   - size recommendation
   - form recommendation
   - color recommendation
   - improvement suggestions
13. User có thể:
   - thử màu khác
   - thử size khác
   - thử form khác
   - mua ngay
   - lưu kết quả
   - xem sản phẩm tương tự

### Trang cần làm

- Try-on product selection
- Selected try-on outfit
- Try-on input
- Try-on result
- Color variant
- Size variant
- Form variant
- Final decision

---

## 7.5. Luồng 5 — Wardrobe

### Mục tiêu

User thêm đồ đang có để AI ưu tiên phối đồ từ wardrobe.

### Bước UI

1. User vào `/wardrobe`.
2. Nếu trống, show empty state.
3. User click:
   - “Thêm item thủ công”
   - “Upload ảnh item”
4. Nếu upload ảnh item:
   - phải consent
5. User nhập:
   - item type
   - category
   - color
   - material
   - fit
   - style tags
   - optional image
6. Lưu item.
7. Wardrobe grid hiển thị item.
8. Khi result outfit dùng item wardrobe:
   - badge “Bạn đã có”
   - không hiển thị nút mua

---

## 7.6. Luồng 6 — Redirect mua hàng

### Mục tiêu

FE xác nhận trước khi chuyển user sang kênh bán ngoài.

### Bước UI

1. User click “Mua ngay”.
2. Chuyển `/redirect/confirm/:id`.
3. Hiển thị:
   - product summary
   - brand/shop
   - selected size
   - selected color
   - selected form
   - notice thanh toán xử lý bởi shop/sàn
4. User click “Tiếp tục đến nơi bán”.
5. FE gọi API track buy click.
6. Backend trả về redirect URL.
7. FE chuyển đến external URL.
8. Nếu lỗi:
   - hiển thị lỗi thân thiện
   - CTA xem sản phẩm tương tự

---

# 8. Brand portal FE

## 8.1. Brand onboarding

### Trang

- Brand login
- Brand register/onboarding

### Fields

- Brand name
- Owner name
- Email
- Phone
- Website
- Shopee
- TikTok Shop
- Instagram
- Product category
- Brand description

### Trạng thái

- Pending approval
- Approved
- Rejected
- Suspended

---

## 8.2. Brand dashboard

### Widgets

- Total products
- Active products
- Products recommended by AI
- Buy clicks
- Click-through rate
- AI try-on attempts
- Try-on to buy-click rate
- Top occasion demand
- Top style demand
- Most tried colors
- Most selected sizes
- Alerts:
  - Sản phẩm thiếu ảnh
  - Sản phẩm thiếu tag
  - Link mua bị lỗi
  - Thiếu size/color data
  - Chưa đủ điều kiện AI try-on

---

## 8.3. Product management

### Product list

Filters:

- Active
- Inactive
- Missing image
- Missing URL
- Missing size data
- Missing color data
- Pending review
- Flagged link
- AI try-on eligible

Columns:

- Image
- Name
- Category
- Price
- Style tags
- Occasion tags
- Fit
- Size data
- Color data
- AI eligibility
- Status
- Actions

### Add/edit product

Fields:

- Product name
- Category
- Price
- Images
- Colors
- Sizes
- Size chart
- Material
- Fit type
- Style tags
- Occasion tags
- Purchase URL
- Stock status
- Sponsored flag
- AI try-on eligibility

Validation warnings:

- Missing image
- Missing purchase URL
- Invalid link
- Missing size data
- Missing color data
- Out of stock
- Not suitable for AI preview

---

## 8.4. Brand analytics pages

### Analytics hub

Cards:

- “Thống kê dữ liệu di chuyển đến kênh bán hàng”
- “Thống kê tỷ lệ thoát trang ở bước chọn size/màu”
- “Thống kê sản phẩm nào đang khiến khách hàng phân vân”
- “Thống kê thử mặc bằng AI”

### Redirect analytics

Metrics:

- Total buy clicks
- Clicks by product
- Clicks by channel
- Click trend by date
- Top clicked products
- CTR by product

Important copy:

> “Đây là số lượt FitMe AI chuyển khách sang kênh bán hàng, không phải đơn hàng hoàn tất.”

### Size/color drop-off analytics

Show:

- View product
- Ask AI advice
- View result
- Select size/color
- Click buy

Insights:

- Size M/L hesitation
- Color hesitation
- Missing size chart issue

### Hesitation product analytics

Show:

- High recommendation, low click products
- High try-on, low buy-click products
- Products replaced by similar products
- Feedback summary
- Suggested actions

### AI try-on analytics

Show:

- Try-on count by product
- Try-on count by color
- Try-on count by size
- Try-on to buy-click funnel
- Most compared sizes
- Most compared colors

---

# 9. Admin portal FE

## 9.1. Admin dashboard

Widgets:

- Total users/anonymous sessions
- Total brands
- Total products
- Total recommendations
- Total buy clicks
- AI try-on attempts
- Preview success rate
- Flagged links
- Products pending validation
- Feedback summary

## 9.2. Brand management

Actions:

- Approve brand
- Reject brand
- Suspend brand
- Edit brand
- View products of brand

## 9.3. Product moderation

Actions:

- Review metadata
- Approve product
- Reject product
- Flag missing image/tag/link
- Flag missing size/color data
- Mark AI try-on eligible/not eligible

## 9.4. Flagged links

Actions:

- View broken/unsafe links
- Approve
- Reject
- Request brand update
- View audit log

## 9.5. Rule management

Style rules:

- Style persona
- Preferred silhouettes
- Preferred colors
- Suitable item types
- Creativity level

Occasion rules:

- Occasion name
- Formality level
- Suitable item types
- Color tone
- Avoided item types
- Note for AI explanation

## 9.6. Privacy & consent

Show:

- Privacy notice versions
- Consent logs
- Image upload consent status
- Data deletion requests
- Preview image deletion workflow

## 9.7. AI try-on monitoring

Show:

- Preview generation status
- Failed preview queue
- Product AI eligibility
- Safety/moderation rules
- Technical status only

---

# 10. FE data types

## 10.1. User/body profile

```ts
type BodyProfile = {
  heightCm: number;
  weightKg: number;
  fitPreference: "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZE" | "UNSURE";
  skinTone: "FAIR" | "MEDIUM" | "TAN" | "DEEP" | "UNSURE";
  goals: string[];
  measurements?: {
    shoulderWidthCm?: number;
    chestCm?: number;
    waistCm?: number;
    abdomenCm?: number;
    hipCm?: number;
    thighCm?: number;
    inseamCm?: number;
    armLengthCm?: number;
  };
};
```

## 10.2. Style profile

```ts
type StyleProfile = {
  primaryStyle: string;
  secondaryStyles: string[];
  riskLevel: "SAFE" | "BALANCED" | "BOLD" | "EXPERIMENTAL";
  artisticMode: boolean;
  preferredColors: string[];
  avoidedColors: string[];
};
```

## 10.3. Product

```ts
type Product = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  colors: string[];
  sizes: string[];
  sizeChart?: SizeChart;
  material?: string;
  fitType: "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZE";
  styleTags: string[];
  occasionTags: string[];
  purchaseUrl: string;
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "LIMITED";
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "INACTIVE";
  aiTryOnEligible: boolean;
};
```

## 10.4. Recommendation result

```ts
type RecommendationResult = {
  id: string;
  title: string;
  recommendedSize?: string;
  alternativeSize?: string;
  recommendedForm?: string;
  recommendedColor?: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  outfitItems: OutfitItem[];
  explanation: {
    bodyFit: string;
    styleFit: string;
    occasionFit: string;
    colorFit: string;
    wardrobeUsage?: string;
  };
  preview?: {
    type: "OUTFIT_BOARD" | "AVATAR" | "USER_PHOTO_2D";
    imageUrl?: string;
    disclaimer: string;
  };
};
```

---

# 11. FE API expectation

FE không tự xử lý logic gợi ý chính. FE gọi BE để lấy:

- session
- products
- profile
- recommendation
- preview status
- analytics
- redirect URL

FE chỉ đảm nhiệm:

- form
- state
- validation nhẹ
- UI display
- upload
- loading state
- error state
- navigation

---

# 12. Error/empty/loading states bắt buộc

## Product list

- Không có sản phẩm
- Không có sản phẩm theo filter
- API lỗi
- Loading skeleton

## Upload ảnh

- Chưa consent
- File quá lớn
- File sai định dạng
- Ảnh không rõ
- Upload thất bại
- Preview generation thất bại

## Recommendation

- Thiếu height/weight
- Thiếu occasion
- Không có sản phẩm phù hợp
- AI service lỗi
- Fallback sang generic outfit

## Redirect

- Link lỗi
- Product inactive
- Product out of stock
- Tracking failed but user still can continue if allowed

---

# 13. MVP FE scope

## Must have

- Home
- Product discovery
- Product detail
- Anonymous session
- Body/style/occasion forms
- AI result page
- Outfit board preview
- Size/form/color suggestion display
- Buy redirect confirmation
- Brand product management basic
- Brand dashboard basic
- Admin product/brand approval basic

## Demo/prototype

- Upload user photo
- AI 2D preview
- AI try-on result
- Size/color/form comparison
- Try-on analytics

## Future

- High-quality AI image generation
- Real affiliate tracking
- Full wardrobe image recognition
- Sponsored recommendation management
- Advanced analytics export
