# FitMe AI — BACKEND DEVELOPMENT GUIDE
## System Architecture + API + Data Model + Business Flow

> Tài liệu này dùng cho AI/Cursor/Backend Developer đọc trước khi phát triển BE.  
> Mục tiêu: xây đúng module, đúng flow, đúng boundary, không biến MVP thành marketplace quá lớn.

---

## 1. Định vị backend

FitMe AI backend là hệ thống trung gian giữa:

1. Fashion User
2. Brand Partner
3. Admin
4. Product Catalog
5. Recommendation Engine
6. AI Preview Service
7. External Sales Platforms

Backend chịu trách nhiệm:

- Quản lý session/account.
- Lưu body/style profile.
- Lưu wardrobe.
- Quản lý brand/product catalog.
- Kiểm tra product eligibility.
- Sinh recommendation hoặc gọi recommendation engine.
- Ghi nhận feedback.
- Ghi nhận buy click trước khi redirect.
- Cung cấp analytics tổng hợp cho brand/admin.
- Quản lý privacy/consent/upload/delete.
- Quản lý admin moderation.

Backend không xử lý:

- Thanh toán
- Đơn hàng
- Vận chuyển
- Hoàn trả
- Chăm sóc khách hàng sau mua
- Xác nhận đơn hàng thật trên Shopee/TikTok/website brand

---

## 2. Stack đề xuất

Nếu chưa có stack chính thức:

- Java 21
- Spring Boot 3.x
- Maven
- PostgreSQL
- Spring Security + JWT
- Spring Data JPA
- Flyway migration
- Object storage: S3/Cloudinary/local mock for MVP
- Redis optional for session/cache
- OpenAPI/Swagger
- Docker Compose for local dev

---

## 3. Kiến trúc backend đề xuất

Dùng modular monolith cho MVP, không tách microservice quá sớm.

```txt
src/main/java/com/fitme/
  auth/
  session/
  userprofile/
  wardrobe/
  brand/
  product/
  recommendation/
  tryon/
  preview/
  redirect/
  feedback/
  analytics/
  admin/
  privacy/
  storage/
  common/
```

Mỗi module nên có:

```txt
controller/
service/
repository/
entity/
dto/
mapper/
exception/
```

Ví dụ:

```txt
product/
  controller/ProductController.java
  controller/BrandProductController.java
  controller/AdminProductController.java
  service/ProductService.java
  service/ProductEligibilityService.java
  repository/ProductRepository.java
  entity/Product.java
  dto/ProductResponse.java
  dto/CreateProductRequest.java
  mapper/ProductMapper.java
```

---

## 4. Architecture principles

### 4.1. Modular monolith first

MVP nên dùng modular monolith để dễ phát triển, demo, test, deploy.

Không cần microservice ngay vì:

- Team nhỏ
- Scope còn thay đổi
- AI preview có thể mock/demo
- Analytics chưa cần scale lớn

### 4.2. Recommendation service tách logic

Không viết toàn bộ logic gợi ý trong controller.

Controller chỉ nhận request.  
Service xử lý nghiệp vụ.  
Recommendation engine xử lý rule/prompt/matching.

### 4.3. Privacy by design

Ảnh người dùng, số đo, style profile là dữ liệu nhạy cảm về trải nghiệm cá nhân. Backend phải kiểm soát:

- consent trước upload
- quyền truy cập ảnh
- delete request
- không expose data cho brand
- analytics brand chỉ dùng aggregate

### 4.4. External sales platform là outside system

Backend chỉ redirect và track click, không khẳng định đơn hàng hoàn tất.

Dùng thuật ngữ:

- redirect click
- buy click
- product interest
- try-on to redirect rate

Không gọi là completed order nếu không có dữ liệu order thật.

---

# 5. Module overview

## 5.1. Auth module

Chức năng:

- Register user
- Login user
- Verify email
- Forgot password
- JWT access token
- Role-based access

Roles:

```txt
ANONYMOUS
USER
BRAND_OWNER
ADMIN
```

MVP vẫn cho anonymous session dùng core flow.

## 5.2. Session module

Chức năng:

- Tạo anonymous session
- Gắn body profile/style profile/wardrobe/recommendation/feedback vào session
- Cho phép convert anonymous session thành user account nếu user đăng ký

## 5.3. User profile module

Chức năng:

- Lưu body profile
- Lưu style profile
- Lưu fit preference
- Lưu skin tone
- Xóa/anonymize profile data

## 5.4. Wardrobe module

Chức năng:

- Add wardrobe item manually
- Upload wardrobe item image with consent
- List wardrobe items
- Update/delete item
- Mark item source as USER_WARDROBE

## 5.5. Brand module

Chức năng:

- Brand onboarding request
- Admin approve/reject brand
- Brand profile management
- Brand status management

## 5.6. Product catalog module

Chức năng:

- Brand create/edit product
- Import product catalog later
- Admin review product
- Validate product metadata
- Check AI try-on eligibility
- Product search/filter for user

## 5.7. Recommendation module

Chức năng:

- Generate outfit recommendation
- Generate size recommendation
- Generate form recommendation
- Generate color recommendation
- Match wardrobe + brand products
- Return explanation

MVP có thể rule-based + mock LLM output.

## 5.8. Preview/Try-on module

Chức năng:

- Upload user photo with consent
- Photo quality check
- Generate preview request
- Track preview status
- Return preview image/mock image
- Delete uploaded photo/preview

MVP có thể dùng mock preview hoặc outfit board.

## 5.9. Redirect module

Chức năng:

- Track buy click
- Validate product purchase URL
- Return redirect URL
- Handle broken link
- Create flagged link record

## 5.10. Feedback module

Chức năng:

- User submit feedback on recommendation
- Store feedback tags
- Use feedback for analytics

## 5.11. Analytics module

Chức năng:

- Aggregate buy clicks
- Aggregate recommendation count
- Aggregate try-on count
- Aggregate size/color hesitation
- Aggregate product hesitation
- Brand analytics only aggregate
- Admin analytics global aggregate

## 5.12. Admin module

Chức năng:

- Brand approval
- Product moderation
- Flagged link queue
- Style persona rules
- Occasion rules
- Privacy/consent management
- AI try-on monitoring

## 5.13. Privacy module

Chức năng:

- Privacy notice version
- Consent records
- Data deletion requests
- Image deletion
- Audit logs

---

# 6. Data model đề xuất

## 6.1. UserAccount

```txt
id UUID PK
email varchar unique
password_hash varchar
display_name varchar
role enum USER/BRAND_OWNER/ADMIN
email_verified boolean
status enum ACTIVE/SUSPENDED/DELETED
created_at timestamp
updated_at timestamp
```

## 6.2. AnonymousSession

```txt
id UUID PK
session_token varchar unique
linked_user_id UUID nullable
privacy_version varchar
created_at timestamp
last_seen_at timestamp
expires_at timestamp
```

## 6.3. BodyProfile

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
height_cm int not null
weight_kg decimal not null
fit_preference enum SLIM/REGULAR/RELAXED/OVERSIZE/UNSURE
skin_tone enum FAIR/MEDIUM/TAN/DEEP/UNSURE
goals text/jsonb
shoulder_width_cm decimal nullable
chest_cm decimal nullable
waist_cm decimal nullable
abdomen_cm decimal nullable
hip_cm decimal nullable
thigh_cm decimal nullable
inseam_cm decimal nullable
arm_length_cm decimal nullable
created_at timestamp
updated_at timestamp
```

Rule:

- `height_cm` và `weight_kg` bắt buộc.
- Advanced measurement optional.

## 6.4. StyleProfile

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
primary_style varchar not null
secondary_styles jsonb
risk_level enum SAFE/BALANCED/BOLD/EXPERIMENTAL
artistic_mode boolean
preferred_colors jsonb
avoided_colors jsonb
created_at timestamp
updated_at timestamp
```

## 6.5. Brand

```txt
id UUID PK
owner_user_id UUID nullable
name varchar
description text
logo_url text
website_url text
shopee_url text
tiktok_shop_url text
instagram_url text
facebook_url text
contact_email varchar
contact_phone varchar
status enum PENDING/APPROVED/REJECTED/SUSPENDED
created_at timestamp
updated_at timestamp
```

## 6.6. Product

```txt
id UUID PK
brand_id UUID
name varchar
description text
category varchar
price decimal
currency varchar default VND
material varchar
fit_type enum SLIM/REGULAR/RELAXED/OVERSIZE/UNKNOWN
purchase_url text
purchase_channel enum SHOPEE/TIKTOK_SHOP/BRAND_WEBSITE/INSTAGRAM/FACEBOOK/OTHER
stock_status enum IN_STOCK/OUT_OF_STOCK/LIMITED/UNKNOWN
status enum DRAFT/PENDING_REVIEW/ACTIVE/REJECTED/INACTIVE/FLAGGED
is_sponsored boolean
ai_try_on_eligible boolean
created_at timestamp
updated_at timestamp
```

## 6.7. ProductImage

```txt
id UUID PK
product_id UUID
image_url text
image_type enum MAIN/DETAIL/MODEL/LOOKBOOK
sort_order int
created_at timestamp
```

## 6.8. ProductVariant

```txt
id UUID PK
product_id UUID
color_name varchar
color_hex varchar nullable
size_label varchar
sku varchar nullable
stock_status enum IN_STOCK/OUT_OF_STOCK/LIMITED/UNKNOWN
created_at timestamp
updated_at timestamp
```

## 6.9. ProductTag

```txt
id UUID PK
product_id UUID
tag_type enum STYLE/OCCASION/COLOR/FIT/MATERIAL/SEASON
tag_value varchar
```

## 6.10. SizeChart

```txt
id UUID PK
product_id UUID
size_label varchar
chest_cm decimal nullable
waist_cm decimal nullable
hip_cm decimal nullable
shoulder_cm decimal nullable
length_cm decimal nullable
inseam_cm decimal nullable
weight_min_kg decimal nullable
weight_max_kg decimal nullable
height_min_cm decimal nullable
height_max_cm decimal nullable
note text nullable
```

## 6.11. WardrobeItem

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
name varchar
item_type varchar
category varchar
color varchar
material varchar nullable
fit_type varchar nullable
style_tags jsonb
image_url text nullable
source_type enum USER_WARDROBE
created_at timestamp
updated_at timestamp
```

## 6.12. OutfitRequest

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
selected_product_id UUID nullable
occasion varchar not null
desired_vibe text nullable
wardrobe_mode enum USE_WARDROBE_FIRST/NEW_ITEMS_ONLY/MIX_WARDROBE_AND_BRAND/NO_WARDROBE_DATA
budget_min decimal nullable
budget_max decimal nullable
created_at timestamp
```

## 6.13. Recommendation

```txt
id UUID PK
outfit_request_id UUID
user_id UUID nullable
session_id UUID nullable
title varchar
recommended_size varchar nullable
alternative_size varchar nullable
recommended_form varchar nullable
recommended_color varchar nullable
confidence enum LOW/MEDIUM/HIGH
explanation_body text
explanation_style text
explanation_occasion text
explanation_color text
explanation_wardrobe text nullable
status enum GENERATED/FAILED
created_at timestamp
```

## 6.14. RecommendationItem

```txt
id UUID PK
recommendation_id UUID
product_id UUID nullable
wardrobe_item_id UUID nullable
role enum TOP/BOTTOM/OUTERWEAR/SHOES/ACCESSORY/ONE_PIECE
source_type enum USER_WARDROBE/BRAND_PRODUCT/GENERIC
display_name varchar
selected_size varchar nullable
selected_color varchar nullable
price decimal nullable
sort_order int
```

Rule:

- USER_WARDROBE item không có buy button.
- BRAND_PRODUCT item có buy button nếu product active + purchase URL valid.

## 6.15. UserPhotoUpload

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
file_url text
file_type varchar
consent_id UUID
quality_status enum GOOD/LOW_QUALITY/INVALID/PENDING
status enum UPLOADED/DELETED/EXPIRED
created_at timestamp
deleted_at timestamp nullable
```

## 6.16. PreviewGeneration

```txt
id UUID PK
recommendation_id UUID nullable
try_on_request_id UUID nullable
photo_upload_id UUID nullable
preview_type enum OUTFIT_BOARD/AVATAR/USER_PHOTO_2D
status enum PENDING/PROCESSING/SUCCEEDED/FAILED
preview_image_url text nullable
error_message text nullable
disclaimer text
created_at timestamp
updated_at timestamp
```

## 6.17. TryOnRequest

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
photo_upload_id UUID nullable
occasion varchar
desired_vibe text nullable
preferred_fit enum SLIM/REGULAR/RELAXED/OVERSIZE/UNSURE
comfort_preference enum LOOK/FIT_COMFORT/BALANCED
normally_worn_top_size varchar nullable
normally_worn_bottom_size varchar nullable
status enum DRAFT/PROCESSING/COMPLETED/FAILED
created_at timestamp
```

## 6.18. TryOnItem

```txt
id UUID PK
try_on_request_id UUID
product_id UUID
role enum TOP/BOTTOM/OUTERWEAR/SHOES/ACCESSORY/ONE_PIECE
selected_size varchar nullable
selected_color varchar nullable
```

## 6.19. BuyClickEvent

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
product_id UUID
recommendation_id UUID nullable
try_on_request_id UUID nullable
selected_size varchar nullable
selected_color varchar nullable
source_page varchar
purchase_url text
channel enum SHOPEE/TIKTOK_SHOP/BRAND_WEBSITE/INSTAGRAM/FACEBOOK/OTHER
created_at timestamp
```

## 6.20. Feedback

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
recommendation_id UUID nullable
try_on_request_id UUID nullable
rating enum VERY_USEFUL/OK/NOT_MY_STYLE/TOO_BASIC/TOO_BOLD/NOT_OCCASION_FIT/SIZE_NOT_FIT/COLOR_NOT_FIT
comment text nullable
created_at timestamp
```

## 6.21. ConsentRecord

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
consent_type enum PRIVACY_NOTICE/PHOTO_UPLOAD/WARDROBE_IMAGE_UPLOAD/AI_PREVIEW
consent_version varchar
accepted boolean
created_at timestamp
```

## 6.22. FlaggedLink

```txt
id UUID PK
product_id UUID
purchase_url text
reason enum BROKEN_URL/UNSAFE_URL/REDIRECT_ERROR/MISSING_URL
status enum OPEN/RESOLVED/REJECTED
created_at timestamp
resolved_at timestamp nullable
```

## 6.23. DataDeletionRequest

```txt
id UUID PK
user_id UUID nullable
session_id UUID nullable
request_type enum BODY_PROFILE/STYLE_PROFILE/PHOTO_UPLOAD/WARDROBE/RECOMMENDATION_HISTORY/ALL
status enum PENDING/PROCESSING/COMPLETED/FAILED
created_at timestamp
completed_at timestamp nullable
```

---

# 7. Business rules backend

## 7.1. Session rules

- Anonymous session allowed for MVP.
- Session must not contain direct identity.
- If user registers later, ask consent before linking anonymous data.

## 7.2. Body profile rules

- height_cm required.
- weight_kg required.
- advanced measurements optional.
- invalid ranges rejected.
- outputs must avoid body-shaming language.

Suggested validation:

```txt
height_cm: 100 - 230
weight_kg: 25 - 250
measurements: positive values only
```

## 7.3. Style rules

- Primary style required or default to Casual/Balanced.
- Artistic mode increases creativity but must respect occasion.
- Risk level controls creativity.

## 7.4. Wardrobe rules

- Wardrobe item can be added without image.
- Required manual fields:
  - item_type/category
  - color
- Wardrobe item source must be USER_WARDROBE.
- Wardrobe item must not expose buy button.

## 7.5. Outfit request rules

- Occasion required or default to Casual Daily if product chooses low friction.
- Desired vibe influences recommendation.
- Wardrobe mode controls source priority.
- Budget limits brand product suggestions when possible.

## 7.6. Recommendation rules

- Outfit must include multiple coordinated items.
- Minimum:
  - top or one-piece
  - bottom if not one-piece
  - shoes/accessory/generic suggestion if possible
- Recommendation should explain:
  - body/fit
  - style
  - occasion
  - color
  - wardrobe usage if relevant
- Sponsored product cannot override fit/occasion relevance.

## 7.7. Product eligibility rules

Product can be recommended if:

- status = ACTIVE
- stock_status != OUT_OF_STOCK
- purchase_url exists for buy button
- product has at least one image
- product has category
- product has style/occasion tags if possible

Product can be AI try-on eligible if:

- product has clear image
- product has size data
- product has color data
- product has purchase URL
- product is active
- product is not out of stock
- product is suitable for AI preview

## 7.8. Buy redirect rules

- Track buy click before redirect.
- If URL broken, create FlaggedLink.
- Do not claim completed purchase.
- Return redirect URL only for valid active product.

## 7.9. Privacy rules

- User photo upload requires consent.
- Brand cannot access personal photos or body profile.
- User can delete uploaded photo.
- Admin sees technical status, not raw personal data unless strictly necessary.
- Analytics for brand must be aggregated.

---

# 8. API design

Base path:

```txt
/api/v1
```

## 8.1. Session APIs

```http
POST /sessions/anonymous
GET /sessions/current
POST /sessions/link-to-user
```

### POST /sessions/anonymous response

```json
{
  "sessionId": "uuid",
  "sessionToken": "token",
  "privacyVersion": "2026-01"
}
```

## 8.2. Auth APIs

```http
POST /auth/register
POST /auth/login
POST /auth/verify-email
POST /auth/forgot-password
POST /auth/refresh-token
POST /auth/logout
```

## 8.3. User profile APIs

```http
POST /me/body-profile
GET /me/body-profile
PUT /me/body-profile
DELETE /me/body-profile

POST /me/style-profile
GET /me/style-profile
PUT /me/style-profile
DELETE /me/style-profile
```

Anonymous version can use session token header:

```txt
X-Anonymous-Session: <sessionToken>
```

## 8.4. Wardrobe APIs

```http
GET /wardrobe/items
POST /wardrobe/items
PUT /wardrobe/items/{id}
DELETE /wardrobe/items/{id}
POST /wardrobe/items/{id}/image
```

## 8.5. Product public APIs

```http
GET /products
GET /products/{id}
GET /products/{id}/similar
GET /brands
GET /brands/{id}
```

Query filters:

```txt
category
brandId
priceMin
priceMax
style
occasion
color
fitType
size
aiTryOnEligible
```

## 8.6. Recommendation APIs

```http
POST /recommendations
GET /recommendations/{id}
POST /recommendations/{id}/save
POST /recommendations/{id}/feedback
GET /recommendations/{id}/similar-products
```

### POST /recommendations request

```json
{
  "sessionId": "uuid",
  "selectedProductId": "uuid|null",
  "bodyProfile": {},
  "styleProfile": {},
  "occasion": "Đi cafe",
  "desiredVibe": "nghệ nhưng vẫn gọn",
  "wardrobeMode": "MIX_WARDROBE_AND_BRAND",
  "budgetMin": 200000,
  "budgetMax": 700000
}
```

### POST /recommendations response

```json
{
  "recommendationId": "uuid",
  "title": "Outfit đi cafe phong cách Korean casual",
  "recommendedSize": "M",
  "alternativeSize": "L",
  "recommendedForm": "Regular/Relaxed",
  "recommendedColor": "Navy",
  "confidence": "HIGH",
  "outfitItems": [],
  "explanation": {
    "bodyFit": "Form regular giúp tổng thể thoải mái nhưng vẫn gọn.",
    "styleFit": "Phù hợp với gu Korean casual bạn chọn.",
    "occasionFit": "Phù hợp cho đi cafe vì nhẹ nhàng và dễ mặc.",
    "colorFit": "Navy tạo cảm giác trưởng thành và dễ phối."
  },
  "preview": {
    "type": "OUTFIT_BOARD",
    "imageUrl": null,
    "disclaimer": "Ảnh minh họa bằng AI, dùng để tham khảo."
  }
}
```

## 8.7. Photo upload / preview APIs

```http
POST /uploads/user-photo/consent
POST /uploads/user-photo
GET /uploads/user-photo/{id}/quality
DELETE /uploads/user-photo/{id}

POST /previews
GET /previews/{id}
DELETE /previews/{id}
```

### POST /previews request

```json
{
  "recommendationId": "uuid",
  "photoUploadId": "uuid|null",
  "previewType": "USER_PHOTO_2D"
}
```

## 8.8. Try-on APIs

```http
POST /try-on/requests
GET /try-on/requests/{id}
POST /try-on/requests/{id}/items
POST /try-on/requests/{id}/generate
GET /try-on/requests/{id}/result
POST /try-on/requests/{id}/variants/color
POST /try-on/requests/{id}/variants/size
POST /try-on/requests/{id}/variants/form
POST /try-on/requests/{id}/save
POST /try-on/requests/{id}/feedback
```

## 8.9. Redirect APIs

```http
POST /redirects/buy-click
GET /redirects/{eventId}
```

### POST /redirects/buy-click request

```json
{
  "productId": "uuid",
  "recommendationId": "uuid|null",
  "tryOnRequestId": "uuid|null",
  "selectedSize": "M",
  "selectedColor": "Navy",
  "sourcePage": "AI_RESULT"
}
```

Response:

```json
{
  "eventId": "uuid",
  "redirectUrl": "https://shopee.vn/...",
  "channel": "SHOPEE"
}
```

## 8.10. Brand APIs

```http
POST /brand/onboarding
GET /brand/me
PUT /brand/me

GET /brand/products
POST /brand/products
GET /brand/products/{id}
PUT /brand/products/{id}
DELETE /brand/products/{id}
POST /brand/products/{id}/submit-review

GET /brand/dashboard
GET /brand/analytics/redirect
GET /brand/analytics/dropoff
GET /brand/analytics/hesitation
GET /brand/analytics/try-on
GET /brand/products/{id}/analytics
```

## 8.11. Admin APIs

```http
GET /admin/dashboard

GET /admin/brands
POST /admin/brands/{id}/approve
POST /admin/brands/{id}/reject
POST /admin/brands/{id}/suspend

GET /admin/products/pending
POST /admin/products/{id}/approve
POST /admin/products/{id}/reject
POST /admin/products/{id}/flag

GET /admin/flagged-links
POST /admin/flagged-links/{id}/resolve
POST /admin/flagged-links/{id}/reject

GET /admin/rules/styles
POST /admin/rules/styles
PUT /admin/rules/styles/{id}
DELETE /admin/rules/styles/{id}

GET /admin/rules/occasions
POST /admin/rules/occasions
PUT /admin/rules/occasions/{id}
DELETE /admin/rules/occasions/{id}

GET /admin/privacy/consents
GET /admin/privacy/deletion-requests
POST /admin/privacy/deletion-requests/{id}/process

GET /admin/try-on/monitoring
GET /admin/try-on/failed-previews
```

---

# 9. Core service logic

## 9.1. RecommendationService.generate()

Pseudo-flow:

```txt
1. Validate session/user.
2. Validate body profile.
3. Validate style profile.
4. Validate occasion.
5. Load wardrobe if wardrobeMode uses wardrobe.
6. Load eligible brand products.
7. If selectedProductId exists:
   - include selected product as anchor item.
8. Score products by:
   - occasion match
   - style match
   - color match
   - fit match
   - budget match
   - stock availability
   - sponsored boost with constraints
9. Build coordinated outfit:
   - top/one-piece
   - bottom if needed
   - shoes/accessory if possible
10. Generate size recommendation from size chart + body data.
11. Generate form recommendation from fit preference + style + occasion.
12. Generate color recommendation from skin tone + style + occasion + available colors.
13. Generate explanation.
14. Save recommendation.
15. Return result DTO.
```

## 9.2. ProductEligibilityService

Checks:

```txt
canBeListed
canBeRecommended
canShowBuyButton
canBeUsedForAiTryOn
```

### canShowBuyButton

True if:

- product status ACTIVE
- stock not OUT_OF_STOCK
- purchase_url not blank
- URL valid/safe

### canBeUsedForAiTryOn

True if:

- canShowBuyButton true
- has clear product image
- has size chart or size variants
- has color variants
- has supported category

## 9.3. PreviewService

MVP implementation options:

### Option A — Mock preview

Return placeholder generated outfit board.

### Option B — Static outfit board

Compose product images into a board.

### Option C — AI image generation integration

Call external AI image service, async status polling.

Backend should abstract this behind interface:

```java
interface PreviewGenerator {
    PreviewResult generate(PreviewRequest request);
}
```

## 9.4. RedirectService

Pseudo-flow:

```txt
1. Load product.
2. Check product active.
3. Check purchase URL.
4. Create BuyClickEvent.
5. If URL invalid:
   - create FlaggedLink
   - return error
6. Return redirect URL.
```

## 9.5. AnalyticsService

Do not calculate from frontend.

Aggregate from backend events:

- Recommendation created
- Buy click
- Try-on request
- Variant comparison
- Feedback
- Similar product view
- Product replacement

---

# 10. Analytics event design

## 10.1. Event types

```txt
PRODUCT_VIEWED
AI_CONSULTATION_STARTED
RECOMMENDATION_GENERATED
OUTFIT_SAVED
PHOTO_UPLOAD_CONSENT_ACCEPTED
PHOTO_UPLOADED
PREVIEW_GENERATED
TRY_ON_STARTED
TRY_ON_GENERATED
SIZE_COMPARED
COLOR_COMPARED
FORM_COMPARED
SIMILAR_PRODUCT_VIEWED
BUY_CLICKED
FEEDBACK_SUBMITTED
REDIRECT_FAILED
```

## 10.2. AnalyticsEvent table

```txt
id UUID PK
event_type varchar
user_id UUID nullable
session_id UUID nullable
brand_id UUID nullable
product_id UUID nullable
recommendation_id UUID nullable
try_on_request_id UUID nullable
metadata jsonb
created_at timestamp
```

Brand dashboards read only aggregated data from this table.

---

# 11. Security requirements

## 11.1. Auth

- Password hashed with BCrypt/Argon2.
- JWT access token short-lived.
- Refresh token if needed.
- Role-based authorization.

## 11.2. Authorization rules

- User can only access own profile/wardrobe/photo/preview.
- Brand can only access own brand/products/analytics.
- Brand cannot access user personal data.
- Admin can access moderation/analytics but should not expose raw private photos in normal dashboard.
- Public can access active products only.

## 11.3. Upload security

- Validate file type.
- Validate file size.
- Store with private access if user photo.
- Generate signed URL only for owner.
- Scan or basic validate if possible.
- Delete file when requested.

## 11.4. URL safety

Purchase URL should be validated:

- valid URL format
- allowed domain or safe redirect policy
- not javascript/data URL
- not empty

---

# 12. Status and enums

## ProductStatus

```txt
DRAFT
PENDING_REVIEW
ACTIVE
REJECTED
INACTIVE
FLAGGED
```

## BrandStatus

```txt
PENDING
APPROVED
REJECTED
SUSPENDED
```

## PreviewStatus

```txt
PENDING
PROCESSING
SUCCEEDED
FAILED
```

## PhotoQualityStatus

```txt
PENDING
GOOD
LOW_QUALITY
INVALID
```

## WardrobeMode

```txt
USE_WARDROBE_FIRST
NEW_ITEMS_ONLY
MIX_WARDROBE_AND_BRAND
NO_WARDROBE_DATA
```

## SourceType

```txt
USER_WARDROBE
BRAND_PRODUCT
GENERIC
```

## Confidence

```txt
LOW
MEDIUM
HIGH
```

---

# 13. MVP backend scope

## Must have

- Anonymous session
- Auth basic
- Body profile
- Style profile
- Product catalog
- Brand product CRUD
- Admin product approval
- Recommendation generation rule-based
- Outfit result
- Buy click tracking
- Redirect URL return
- Basic brand dashboard
- Basic admin dashboard

## Demo/prototype

- User photo upload
- Photo quality mock
- AI 2D preview mock/static
- Try-on request
- Size/color/form comparison
- Try-on analytics

## Future

- Real AI image generation
- Affiliate order tracking
- Advanced ML recommendation
- Wardrobe image recognition
- Sponsored recommendation engine
- Full brand self-service analytics export

---

# 14. Recommended implementation phases

## Phase 1 — Core catalog + user recommendation

- Session
- Product catalog
- Body/style/occasion form APIs
- Recommendation result
- Redirect tracking

## Phase 2 — Brand/admin

- Brand onboarding
- Product CRUD
- Admin approval
- Basic analytics

## Phase 3 — Wardrobe

- Manual wardrobe item
- Wardrobe-first recommendation
- Wardrobe item display

## Phase 4 — AI preview prototype

- Consent
- User photo upload
- Preview generation mock
- Delete photo
- Preview result page

## Phase 5 — Try-on analytics

- Try-on request
- Variant compare events
- Try-on analytics dashboard

---

# 15. Acceptance criteria backend

## Recommendation

- User can generate recommendation without login.
- Height/weight required.
- Occasion used in result.
- Result includes multiple coordinated items.
- Result includes size/form/color suggestions.
- Explanation uses positive language.
- Brand product buy button appears only when product is active and URL valid.

## Redirect

- Click is tracked before redirect URL returned.
- Broken URL creates flagged link.
- Response never claims completed order.

## Brand

- Brand can create product.
- Product pending until approved.
- Brand sees only own products.
- Brand analytics uses aggregate data only.

## Admin

- Admin can approve/reject brand.
- Admin can approve/reject product.
- Admin can see flagged links.
- Admin can manage style/occasion rules.

## Privacy

- Upload photo requires consent.
- User can delete uploaded photo.
- Brand cannot fetch user photo.
- Data deletion request can be created and processed.

---

# 16. Key warnings for AI developer

Do not build payment/order system in MVP.

Do not expose user photos/body data to brand.

Do not put recommendation logic in controller.

Do not overbuild microservices.

Do not call analytics “completed purchase” unless there is real order integration.

Do not claim AI preview is exact virtual fitting.

Do not require login before first recommendation.

Do not block user if advanced measurements are missing.

Do not show Buy button for USER_WARDROBE item.

Do not recommend out-of-stock products.

Do not allow broken/unsafe URLs to redirect silently.
