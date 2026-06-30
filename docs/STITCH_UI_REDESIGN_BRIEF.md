# FitMe AI — Brief thiết kế lại toàn bộ giao diện (Stitch AI)

> **Mục đích:** Tài liệu này dùng làm prompt/brief cho **Google Stitch** (hoặc công cụ thiết kế AI tương đương) để thiết kế lại **100% giao diện** ứng dụng FitMe AI — giữ nguyên luồng nghiệp vụ, thay đổi visual system, layout và component patterns.
>
> **Ngôn ngữ UI:** Tiếng Việt (100%).  
> **Nền tảng:** Web responsive — **mobile-first** (iPhone 13 ~ 390×844), tablet, desktop (max content ~1280px).  
> **Stack triển khai:** Next.js + TailwindCSS + shadcn/ui (design cần map được sang CSS variables).

---

## 1. Tóm tắt sản phẩm

**FitMe AI** là web app tư vấn thời trang cá nhân hóa:

- Gợi ý outfit, size, form, màu sắc theo dáng người & gu thời trang
- Preview outfit 2D minh họa (AI disclaimer bắt buộc)
- Thử mặc ảnh sản phẩm (try-on catalog)
- Chuyển hướng mua hàng qua kênh ngoài (Shopee / website brand)
- 3 vai trò: **Người dùng (USER)**, **Brand Owner**, **Admin**

**Tagline:** *"Đúng size, hợp dáng, chuẩn màu — thử trước khi mua."*

**Điểm khác biệt cần thể hiện trong UI:** Kết hợp **fashion editorial** (lookbook, catalog cao cấp) + **AI assistant** (gợi ý thông minh, không phải chatbot generic).

---

## 2. Đánh giá giao diện hiện tại (audit)

### 2.1 Điểm mạnh

| Hạng mục | Mô tả |
|----------|--------|
| Mobile bottom nav | 5 tab + FAB “Tư vấn AI” ở giữa — pattern quen thuộc (app-like) |
| Wizard flows | AI consultation & Try-on có stepper 3–4 bước rõ ràng |
| Design tokens | Đã có palette tím/hồng, font display, gradient AI |
| Catalog grid | Discover & Try-on dùng grid 2 cột mobile, editorial product card |
| Sticky toolbar | Header collapse khi scroll (Discover filter, wizard title) |

### 2.2 Điểm yếu / cần redesign

| Vấn đề | Chi tiết |
|--------|----------|
| **Thiếu nhất quán visual** | Trộn glassmorphism, gradient đậm, editorial hero, portal admin đơn giản — chưa có design language thống nhất |
| **Màu sắc “AI generic”** | Tím `#7c3aed` + hồng gradient — giống nhiều app AI, chưa đủ “fashion luxury” |
| **Typography** | Geist + Plus Jakarta Sans — ổn nhưng chưa có hierarchy editorial (headline vs caption vs price) |
| **Trang chủ desktop vs mobile** | Lookbook stack chỉ hiện `lg+`; mobile hero tương đối phẳng |
| **Auth / Portal** | Card trắng đơn giản, tách biệt hoàn toàn với consumer app |
| **Empty / error / loading** | Skeleton & error state generic, chưa có personality |
| **Micro-interaction** | Ít feedback tactile; button states chưa nổi bật trên mobile |
| **Information density** | Một số trang (AI result, product detail) cần layout rõ hơn: hero image → badges → CTA |
| **Footer** | Ẩn trên mobile (`hidden md:block`) — bottom nav bù nhưng thiếu legal/links trên mobile |

### 2.3 Palette & token hiện tại (tham chiếu — **có thể thay hoàn toàn**)

```
Background:     #faf8f5 (warm off-white)
Foreground:     #14121c
Primary:        #7c3aed (violet)
Accent:         #fce7f3 / #f472b6 (pink)
Fashion ink:    #0f0e14 (footer dark)
Border radius:  1rem (16px)
Fonts:          Geist Sans (body), Plus Jakarta Sans (display)
```

---

## 3. Mục tiêu redesign

### 3.1 Vision (đề xuất cho Stitch)

Thiết kế theo hướng **“Premium K-Fashion AI Stylist”**:

- Cảm giác **lookbook / magazine** hơn là dashboard SaaS
- **Ảnh sản phẩm là hero** — UI chrome mỏng, không che nội dung
- AI được thể hiện tinh tế (badge, sparkle nhỏ, gradient accent) — không lạm dụng gradient toàn màn
- **Mobile-first**: thumb zone, bottom nav, full-width CTA, filter dạng bottom sheet
- **Accessibility**: contrast WCAG AA, touch target ≥44px, focus ring rõ

### 3.2 Nguyên tắc thiết kế

1. **Một design system** cho Consumer; Brand/Admin có thể dùng sub-theme (cùng font & radius, palette trung tính hơn)
2. **3 cấp độ mật độ:** Marketing (home) → Catalog (discover) → Task (wizard, form)
3. **Luồng AI = guided journey**, không phải form dài một trang
4. **Disclaimer AI** luôn visible ở preview/result — thiết kế như “legal note” thanh lịch, không alarm đỏ
5. **Tiếng Việt** — label ngắn, dễ hiểu; tránh thuật ngữ kỹ thuật

### 3.3 Mood board keywords

`K-Fashion` · `Clean editorial` · `Soft luxury` · `Neutral base + accent` · `Rounded but not bubbly` · `Photography-forward` · `Trustworthy AI`

---

## 4. Kiến trúc thông tin (sitemap)

### 4.1 Consumer app (ưu tiên thiết kế cao)

```
/                           Trang chủ (marketing)
/discover                   Khám phá sản phẩm (+ search, filter)
/products/[id]              Chi tiết sản phẩm
/similar-products           Sản phẩm tương tự

/ai/start                   Hub wizard tư vấn (3 bước)
/ai/body-profile            Bước 1: Thông tin cơ thể
/ai/style-profile           Bước 2: Gu thời trang
/ai/occasion                Bước 3: Hoàn cảnh
/ai/processing              Đang tạo gợi ý (loading)
/ai/result/[id]             Kết quả outfit AI
/ai/variants/[id]           So sánh size/form
/ai/preview/[id]            Preview 2D
/ai/photo-upload            Upload ảnh (+ consent)
/ai/photo-check             Kiểm tra chất lượng ảnh

/try-on                     Chọn sản phẩm thử mặc
/try-on/selected            Xác nhận item đã chọn
/try-on/input               Nhập số đo / occasion
/try-on/processing          Đang render
/try-on/result/[id]         Kết quả try-on
/try-on/size|form|color/[id] So sánh biến thể
/try-on/decision/[id]       Quyết định mua / lưu

/wardrobe                   Tủ đồ cá nhân
/saved-outfits              Outfit đã lưu
/profile                    Hub hồ sơ
/profile/privacy            Quyền riêng tư & xóa dữ liệu

/auth/login | register | forgot-password | reset-password | verify-email

/redirect/confirm/[id]      Xác nhận trước khi mua
/redirect/loading           Chuyển hướng ra ngoài
```

### 4.2 Brand Portal (ưu tiên trung bình)

```
/brand/login
/brand/onboarding           Đăng ký đối tác
/brand/pending              Chờ duyệt
/brand/dashboard            Tổng quan KPI
/brand/products             Danh sách SP
/brand/products/new         Tạo SP
/brand/products/[id]/edit
/brand/analytics/*          Phân tích
/brand/settings
```

### 4.3 Admin Portal (ưu tiên thấp hơn — data-dense)

```
/admin/login
/admin/dashboard
/admin/brands
/admin/products/moderation
/admin/flagged-links
/admin/rules/styles | occasions
/admin/analytics
/admin/privacy
/admin/try-on-monitoring
```

---

## 5. Layout system & chrome

### 5.1 Consumer — Desktop (≥768px)

| Vùng | Hiện tại | Mong muốn redesign |
|------|----------|-------------------|
| **Top header** | Sticky, logo trái, nav giữa, search + auth phải | Giữ sticky; có thể thu gọn khi scroll; nav rõ active state |
| **Footer** | Dark 3 cột | Có thể lighter hoặc giữ dark — cần đồng bộ với home |
| **Content** | `max-w-7xl` centered | Giữ; catalog full-bleed optional cho hero |

### 5.2 Consumer — Mobile (<768px)

| Vùng | Hiện tại | Mong muốn redesign |
|------|----------|-------------------|
| **Top header** | Logo + icon search (compact pages) | Tối giản; wizard pages có back + title |
| **Bottom nav** | 5 tab, FAB AI giữa | Redesign iconography & active state; FAB nổi bật nhưng không che content |
| **Ẩn bottom nav** | Auth, AI wizard, Brand, Admin | Giữ logic — thiết kế “immersive mode” |

**Bottom nav tabs (giữ nguyên chức năng):**

| Tab | Label | Route |
|-----|-------|-------|
| 1 | Trang chủ | `/` |
| 2 | Khám phá | `/discover` |
| 3 (FAB) | Tư vấn AI | `/ai/start` |
| 4 | Thử mặc | `/try-on` |
| 5 | Hồ sơ | `/profile` hoặc login |

### 5.3 Wizard toolbar (AI + Try-on)

Pattern hiện tại cần redesign visual nhưng **giữ cấu trúc**:

```
┌─────────────────────────────────────┐
│ ← Back          [AI badge]          │
│ Title (H1)                          │
│ Subtitle                            │
│ ─────────────────────────────────── │
│ Stepper: (1)──(2)──(3)──(4)         │
│   Chọn    Nhập    Tạo    Kết quả    │
└─────────────────────────────────────┘
  ↳ Sticky khi scroll; compact mode: title nhỏ + stepper inline phải
```

**AI steps:** `Bắt đầu → Thân hình → Gu → Hoàn cảnh → Kết quả`  
**Try-on steps:** `Chọn item → Xác nhận → Nhập liệu → Kết quả`

### 5.4 Brand / Admin portal

- Sidebar trái (desktop) + top bar logo
- Mobile: cần thiết kế **drawer nav** hoặc bottom tab (hiện chưa có mobile nav portal)
- Bảng dữ liệu, stat cards, form CRUD — style **professional**, ít gradient

---

## 6. Danh sách màn hình cần Stitch thiết kế

### Ưu tiên P0 — Core consumer (thiết kế đầy tiên)

| # | Màn hình | Route | Ghi chú nội dung |
|---|----------|-------|------------------|
| 1 | **Home** | `/` | Hero, CTA “Bắt đầu tư vấn outfit”, feature grid, CTA band |
| 2 | **Discover** | `/discover` | Search, filter (category/brand/AI only), product grid 2 col, group by brand |
| 3 | **Product detail** | `/products/[id]` | Gallery, price, size, CTA “Tư vấn AI”, “Thử mặc”, “Mua” |
| 4 | **AI Start** | `/ai/start` | 3 step cards dẫn vào wizard |
| 5 | **Body profile** | `/ai/body-profile` | Form: chiều cao, cân nặng, fit preference, skin tone, goals |
| 6 | **Style profile** | `/ai/style-profile` | Chip chọn style, màu ưa thích |
| 7 | **Occasion** | `/ai/occasion` | Dịp mặc, vibe, budget, wardrobe mode |
| 8 | **AI Processing** | `/ai/processing` | Loading state có personality |
| 9 | **AI Result** | `/ai/result/[id]` | Outfit items, size badges, preview image, disclaimer, actions (lưu, upload ảnh, mua) |
| 10 | **Try-on hub** | `/try-on` | Product picker + selected chips |
| 11 | **Try-on result** | `/try-on/result/[id]` | Preview + disclaimer + CTAs |
| 12 | **Profile hub** | `/profile` | User info, body/style summary, links tủ đồ / đã lưu / privacy |
| 13 | **Login** | `/auth/login` | Email, password, error state, links |

### Ưu tiên P1 — Supporting

| # | Màn hình | Route |
|---|----------|-------|
| 14 | Register | `/auth/register` |
| 15 | Wardrobe | `/wardrobe` |
| 16 | Saved outfits | `/saved-outfits` |
| 17 | Photo upload + consent | `/ai/photo-upload` |
| 18 | Redirect confirm | `/redirect/confirm/[id]` |
| 19 | Discover filter sheet | Mobile bottom sheet |
| 20 | Empty / Error states | Components |

### Ưu tiên P2 — Portal

| # | Màn hình | Route |
|---|----------|-------|
| 21 | Brand login | `/brand/login` |
| 22 | Brand dashboard | `/brand/dashboard` |
| 23 | Brand products list | `/brand/products` |
| 24 | Admin login | `/admin/login` |
| 25 | Admin dashboard | `/admin/dashboard` |
| 26 | Product moderation table | `/admin/products/moderation` |

---

## 7. Component library cần định nghĩa

Stitch cần output **design system** gồm các component sau (variants + states):

### 7.1 Foundations

- Color palette (light mode; optional dark mode)
- Typography scale: display / h1–h4 / body / caption / overline
- Spacing (4px grid), radius, shadow elevation
- Icon style (line vs filled) — hiện dùng Lucide

### 7.2 Actions

| Component | Variants |
|-----------|----------|
| **Button** | Primary, AI/Gradient, Secondary, Outline, Ghost, Destructive |
| **Icon button** | Search, back, close |
| **FAB** | Bottom nav center (Tư vấn AI) |
| **Chip / Toggle** | Style picker, occasion, màu sắc |
| **Badge** | AI eligible, size, confidence, stock |

### 7.3 Navigation

| Component | Mô tả |
|-----------|--------|
| **App header** | Consumer desktop |
| **Mobile bottom nav** | 5 tabs + FAB |
| **Back link** | `← Label` trên wizard/auth |
| **Flow stepper** | Horizontal 3–4 bước, compact variant |
| **Portal sidebar** | Brand/Admin |
| **Breadcrumb** | Optional cho portal |

### 7.4 Content

| Component | Mô tả |
|-----------|--------|
| **Product card** | Catalog (2-col mobile): ảnh, brand, tên, giá, “Xem”, “Thử AI” |
| **Product card** | Default (detail grids) |
| **Outfit item card** | Ảnh + tên + giá + link mua |
| **Stat card** | Portal KPI |
| **Feature card** | Home features |
| **Hub link card** | Profile → Tủ đồ / Đã lưu |
| **Disclaimer block** | AI legal note (role=note) |

### 7.5 Forms & inputs

- Text input, password, email
- Number input (chiều cao/cân nặng)
- Select / Combobox (fit preference, occasion)
- Checkbox (consent upload ảnh)
- Form error message (tiếng Việt, màu đỏ nhẹ)

### 7.6 Feedback

- Loading skeleton (product grid, detail)
- Empty state (illustration + CTA)
- Error state (retry button)
- Toast / inline success (optional)

### 7.7 Overlays

- Dialog / bottom sheet (Discover filter mobile)
- Image lightbox (product gallery — optional)

---

## 8. Luồng người dùng chính (wireflow)

### 8.1 Tư vấn AI ẩn danh

```
Home → [Bắt đầu tư vấn outfit]
  → AI Start (session tạo ngầm)
  → Body profile → Style → Occasion
  → Processing → Result
  → (tuỳ chọn) Lưu outfit | Upload ảnh preview | Mua sản phẩm
```

### 8.2 Discover → Tư vấn theo sản phẩm

```
Discover → Product detail → [Tư vấn với sản phẩm này]
  → AI wizard (anchor product context)
  → Result
```

### 8.3 Try-on

```
Try-on hub → chọn sản phẩm → Selected → Input số đo
  → Processing → Result → Size/Form/Color compare → Decision → Redirect mua
```

### 8.4 Đăng nhập & hồ sơ

```
Login → Profile hub → Wardrobe / Saved / Privacy
```

---

## 9. Nội dung & copy mẫu (tiếng Việt)

Dùng đúng hoặc tương đương các chuỗi sau trong mockup:

| Key | Text |
|-----|------|
| Hero headline | Đúng size, hợp dáng, chuẩn màu — thử trước khi mua. |
| Hero sub | FitMe AI giúp bạn tư vấn size, phối đồ và xem preview outfit 2D minh họa. |
| CTA primary | Bắt đầu tư vấn outfit |
| CTA secondary | Khám phá sản phẩm |
| Nav | Khám phá · Thử mặc AI · Tủ đồ · Đã lưu |
| AI disclaimer | Ảnh minh họa bằng AI, dùng để tham khảo. Form thực tế có thể khác tùy chất liệu, bảng size và cách mặc. |
| Search placeholder | Tìm kiếm sản phẩm hoặc thương hiệu... |
| Login | Đăng nhập |
| Brand portal title | Brand Portal — Đăng nhập |

---

## 10. Responsive breakpoints

| Token | Width | Ghi chú |
|-------|-------|---------|
| `mobile` | 0–639px | Bottom nav, 2-col product grid |
| `sm` | 640px+ | Padding tăng |
| `md` | 768px+ | Header nav đầy đủ, ẩn bottom nav padding |
| `lg` | 1024px+ | 3-col product grid, lookbook hero |
| `xl` | 1280px | `max-w-7xl` content |

**Safe area:** Hỗ trợ `env(safe-area-inset-bottom)` cho iPhone notch/home indicator.

---

## 11. Ràng buộc kỹ thuật (không đổi khi redesign)

| Ràng buộc | Chi tiết |
|-----------|----------|
| Framework | Next.js App Router — mỗi route là một page |
| Styling | TailwindCSS v4 + CSS variables trong `:root` |
| Components | shadcn/ui (Radix) — Button, Card, Dialog, Select, Input... |
| Images | `next/image`, aspect ratio 3:4 / 4:5 cho fashion |
| Không thay đổi | URL routes, API contracts, role guards |
| Demo accounts | user@fitme.ai / brand@fitme.ai / admin@fitme.ai — fitme123 |

---

## 12. Deliverables mong đợi từ Stitch

### 12.1 Bắt buộc

- [ ] **Design system page**: colors, type, spacing, shadows, radii
- [ ] **Component kit**: tất cả mục §7 với states (default, hover, active, disabled, error)
- [ ] **P0 screens** (§6): mobile **390px** + desktop **1440px** cho mỗi màn
- [ ] **Interactive states**: bottom nav active, stepper progress, filter sheet open
- [ ] **Notes** cho dev: spacing token, font sizes, hex codes

### 12.2 Nên có

- [ ] Dark mode exploration (optional phase 2)
- [ ] Motion spec: transition header compact, FAB press, page enter
- [ ] Iconography set aligned với nav labels
- [ ] Illustration cho empty states

### 12.3 Export format

- Figma-compatible hoặc Stitch native
- PNG preview từng screen @2x
- Spec sheet: component → Tailwind class mapping gợi ý

---

## 13. Prompt gợi ý (copy vào Stitch)

```
Thiết kế lại toàn bộ UI cho web app "FitMe AI" — nền tảng tư vấn thời trang 
bằng AI (tiếng Việt, mobile-first).

Phong cách: Premium K-Fashion editorial + AI stylist tinh tế. 
Ảnh sản phẩm là trung tâm; UI chrome mỏng; palette neutral ấm + 1 accent (không 
lạm dụng gradient tím-hồng kiểu AI generic).

Thiết kế design system + 13 màn P0:
Home, Discover, Product detail, AI wizard (start + 3 form steps + processing + result),
Try-on hub + result, Profile, Login.

Mobile: bottom navigation 5 tab với FAB "Tư vấn AI" ở giữa.
Desktop: top header + footer.

Wizard: sticky header có back, title, subtitle, horizontal stepper 4 bước.
Product grid: 2 cột mobile. Cards có ảnh 3:4, brand, tên, giá, CTA.

Bao gồm: buttons, chips, badges, form inputs, disclaimer AI, empty/error states.
Ngôn ngữ: tiếng Việt. Tagline: "Đúng size, hợp dáng, chuẩn màu — thử trước khi mua."

Output: design system + screen mockups mobile 390px và desktop 1440px.
```

---

## 14. Tham chiếu code (cho dev sau redesign)

| Thành phần | File |
|------------|------|
| Global styles / tokens | `frontend/src/app/globals.css` |
| Design class constants | `frontend/src/lib/design-tokens.ts` |
| Header | `frontend/src/components/layout/Header.tsx` |
| Mobile bottom nav | `frontend/src/components/layout/MobileBottomNav.tsx` |
| Wizard toolbar | `frontend/src/components/layout/FlowWizardToolbar.tsx` |
| Stepper | `frontend/src/components/layout/FlowStepper.tsx` |
| Product card | `frontend/src/components/common/ProductCard.tsx` |
| Auth shell | `frontend/src/components/layout/AuthCardShell.tsx` |
| Portal layout | `frontend/src/components/layout/PortalLayout.tsx` |
| Button variants | `frontend/src/components/ui/button.tsx` |

---

## 15. Screenshots hiện tại (tham chiếu)

Chạy lệnh sau để capture UI hiện tại làm reference cho Stitch:

```bash
cd frontend
npm run dev   # terminal 1
node scripts/capture-mobile-screens.mjs   # terminal 2
# Output: frontend/test-results/mobile-screens/*.png
```

Các frame: home, discover, discover+filter, ai/start, try-on, profile guest, auth/login, ai/body-profile.

---

*Phiên bản brief: 2026-06-29 · FitMe AI MVP · Liên hệ dev team để sync sau khi Stitch export design.*
