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
  { path: "/brand/analytics", heading: "Phân tích" },
  { path: "/brand/analytics/redirect", heading: "Phân tích chuyển hướng mua" },
  { path: "/brand/analytics/dropoff", heading: "Phân tích điểm rời bỏ" },
  { path: "/brand/analytics/hesitation", heading: "Phân tích do dự" },
  { path: "/brand/analytics/try-on", heading: "Phân tích thử mặc AI" },
  { path: "/brand/settings", heading: "Cài đặt thương hiệu" },
];

export const ADMIN_PAGES: { path: string; heading: string | RegExp }[] = [
  { path: "/admin/dashboard", heading: "Tổng quan hệ thống" },
  { path: "/admin/brands", heading: "Quản lý thương hiệu" },
  { path: "/admin/products/moderation", heading: "Duyệt sản phẩm" },
  { path: "/admin/flagged-links", heading: "Link bị gắn cờ" },
  { path: "/admin/rules/styles", heading: "Rule phong cách" },
  { path: "/admin/rules/occasions", heading: "Rule hoàn cảnh" },
  { path: "/admin/analytics", heading: "Phân tích toàn hệ thống" },
  { path: "/admin/privacy", heading: "Quyền riêng tư & Consent" },
  { path: "/admin/try-on-monitoring", heading: "Giám sát Try-on" },
];
