import { test, expect } from "@playwright/test";
import { ensureSessionViaHome } from "./helpers/consultation";
import { expectPageHeading } from "./helpers/portal";

test.describe("Public route smoke", () => {
  const publicPages: { path: string; heading: string | RegExp }[] = [
    { path: "/", heading: "Đúng size, hợp dáng, chuẩn màu — thử trước khi mua." },
    { path: "/discover", heading: "Khám phá sản phẩm" },
    { path: "/try-on", heading: "Thử mặc bằng AI" },
    { path: "/wardrobe", heading: "Tủ đồ cá nhân" },
    { path: "/saved-outfits", heading: "Đã lưu" },
    { path: "/profile", heading: "Hồ sơ người dùng" },
    { path: "/auth/login", heading: "Đăng nhập" },
    { path: "/auth/register", heading: "Đăng ký tài khoản" },
    { path: "/auth/forgot-password", heading: "Quên mật khẩu" },
    { path: "/auth/verify-email", heading: "Xác minh email" },
    { path: "/brand/login", heading: "Brand Portal — Đăng nhập" },
    { path: "/brand/onboarding", heading: "Đăng ký đối tác Brand" },
    { path: "/admin/login", heading: "Admin — Đăng nhập" },
    { path: "/redirect/loading", heading: "Đang chuyển hướng..." },
  ];

  for (const { path, heading } of publicPages) {
    test(`${path} loads`, async ({ page }) => {
      await expectPageHeading(page, path, heading);
    });
  }

  test("AI consultation step pages load with session", async ({ page }) => {
    await ensureSessionViaHome(page);

    await expectPageHeading(page, "/ai/start", "Bắt đầu tư vấn AI");
    await expectPageHeading(page, "/ai/body-profile", "Thông tin cơ thể");
    await expectPageHeading(page, "/ai/style-profile", "Gu thời trang");
    await expectPageHeading(page, "/ai/occasion", "Hoàn cảnh & vibe");
  });

  test("similar-products without query shows empty state", async ({ page }) => {
    await page.goto("/similar-products");
    await expect(page.getByRole("heading", { name: "Sản phẩm tương tự" })).toBeVisible();
    await expect(page.getByText("Không có dữ liệu")).toBeVisible();
  });

  test("discover product detail page loads", async ({ page }) => {
    await page.goto("/discover");
    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible({ timeout: 30_000 });
    await productLink.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  });
});
