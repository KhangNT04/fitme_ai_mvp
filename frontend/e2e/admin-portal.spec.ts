import { test, expect } from "@playwright/test";

test.describe("Admin portal", () => {
  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(
      page.getByRole("heading", { name: "Admin — Đăng nhập" }),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
