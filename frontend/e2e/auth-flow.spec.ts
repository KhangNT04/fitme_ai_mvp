import { test, expect } from "@playwright/test";
import { loginUser } from "./helpers/auth";

test.describe("User auth flow", () => {
  test("login → profile shows account info", async ({ page }) => {
    await loginUser(page);

    await expect(page.getByRole("heading", { name: "Hồ sơ của tôi" })).toBeVisible();
    await expect(page.getByText("user@fitme.ai")).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Tủ đồ" })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Gợi ý đã lưu" })).toBeVisible();
  });

  test("profile links navigate to wardrobe and saved outfits", async ({ page }) => {
    await loginUser(page);

    await page.locator("main").getByRole("link", { name: "Tủ đồ" }).click();
    await expect(page).toHaveURL(/\/wardrobe/);
    await expect(page.getByRole("heading", { name: "Tủ đồ cá nhân" })).toBeVisible();

    await page.goto("/profile");
    await page.locator("main").getByRole("link", { name: "Gợi ý đã lưu" }).click();
    await expect(page).toHaveURL(/\/saved-outfits/);
  });

  test("forgot password submits and shows confirmation", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await page.locator('input[type="email"]').fill("user@fitme.ai");
    await page.getByRole("button", { name: "Gửi link đặt lại" }).click();
    await expect(
      page.getByText("Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("register page has required fields", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByRole("heading", { name: "Đăng ký tài khoản" })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng ký" })).toBeVisible();
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.locator('input[type="email"]').fill("user@fitme.ai");
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.locator(".text-red-600").first()).toBeVisible({ timeout: 15_000 });
  });
});
