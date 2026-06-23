import { test, expect } from "@playwright/test";
import { expectPath } from "./helpers/auth";

test.describe("RBAC — route guards", () => {
  test("unauthenticated user redirected from brand dashboard", async ({ page }) => {
    await page.goto("/brand/dashboard");
    await expectPath(page, /\/brand\/login/);
  });

  test("unauthenticated user redirected from admin dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expectPath(page, /\/admin\/login/);
  });

  test("regular user blocked from brand portal", async ({ page }) => {
    await page.goto("/auth/login");
    await page.locator('input[type="email"]').fill("user@fitme.ai");
    await page.locator('input[type="password"]').fill("fitme123");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL(/\/profile/);

    await page.goto("/brand/dashboard");
    await expectPath(page, /\/brand\/login/);
  });

  test("brand user blocked from admin portal", async ({ page }) => {
    await page.goto("/brand/login");
    await page.locator('input[type="email"]').fill("brand@fitme.ai");
    await page.locator('input[type="password"]').fill("fitme123");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL(/\/brand\/dashboard/);

    await page.goto("/admin/dashboard");
    await expectPath(page, /\/admin\/login/);
  });

  test("brand login rejects admin credentials", async ({ page }) => {
    await page.goto("/brand/login");
    await page.locator('input[type="email"]').fill("admin@fitme.ai");
    await page.locator('input[type="password"]').fill("fitme123");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(
      page.getByText("Tài khoản này không có quyền Brand"),
    ).toBeVisible({ timeout: 15_000 });
  });
});
