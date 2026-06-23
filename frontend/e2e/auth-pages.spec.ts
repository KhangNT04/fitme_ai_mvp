import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/auth/register");

    await expect(
      page.getByRole("heading", { name: "Đăng ký tài khoản" }),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
