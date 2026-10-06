import { type Page, expect } from "@playwright/test";

export async function expectPageHeading(
  page: Page,
  path: string,
  heading: string | RegExp,
) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible({
    timeout: 20_000,
  });
}

export const BRAND_PAGES: { path: string; heading: string | RegExp }[] = [
  { path: "/brand/dashboard", heading: "Tổng quan" },
  { path: "/brand/products", heading: "Quản lý sản phẩm" },
  { path: "/brand/products/new", heading: "Thêm sản phẩm mới" },
  { path: "/brand/leads", heading: "Khách quan tâm" },
  { path: "/brand/analytics", heading: "Phân tích" },
  { path: "/brand/analytics/redirect", heading: "Phân tích chuyển hướng mua" },
  { path: "/brand/analytics/dropoff", heading: "Phân tích điểm rời bỏ" },
  { path: "/brand/analytics/hesitation", heading: "Phân tích do dự" },
  { path: "/brand/analytics/try-on", heading: "Phân tích thử mặc AI" },
  { path: "/brand/plan", heading: "Gói Plus" },
  { path: "/brand/settings", heading: "Cài đặt thương hiệu" },
];

export const ADMIN_PAGES: { path: string; heading: string | RegExp }[] = [
  { path: "/admin/dashboard", heading: "Tổng quan hệ thống" },
  { path: "/admin/users", heading: "Quản lý tài khoản" },
  { path: "/admin/traffic", heading: "Thống kê truy cập" },
  { path: "/admin/brands", heading: "Quản lý thương hiệu" },
  { path: "/admin/billing/plans", heading: "Gói dịch vụ" },
  { path: "/admin/vouchers", heading: "Voucher brand" },
  { path: "/admin/rewards", heading: "Duyệt chia sẻ" },
  { path: "/admin/reviews", heading: "Đánh giá sản phẩm" },
  { path: "/admin/products/moderation", heading: "Duyệt sản phẩm" },
  { path: "/admin/flagged-links", heading: "Link bị gắn cờ" },
  { path: "/admin/analytics", heading: "Phân tích tăng trưởng" },
  { path: "/admin/paying-customers", heading: "Khách hàng trả tiền" },
  { path: "/admin/privacy", heading: "Quyền riêng tư & Consent" },
  { path: "/admin/try-on-monitoring", heading: "Giám sát thử mặc" },
  { path: "/admin/settings", heading: "Cài đặt hệ thống" },
  { path: "/admin/account", heading: "Đổi mật khẩu" },
];
