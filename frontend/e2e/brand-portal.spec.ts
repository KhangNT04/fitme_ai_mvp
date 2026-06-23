import { test, expect } from "@playwright/test";

test.describe("Brand portal", () => {
  test("brand login page loads", async ({ page }) => {
    await page.goto("/brand/login");

    await expect(
      page.getByRole("heading", { name: "Brand Portal — Đăng nhập" }),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
