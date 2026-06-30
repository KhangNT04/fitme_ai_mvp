import { test, expect } from "@playwright/test";

test.describe("Mobile bottom navigation", () => {
  test("bottom nav visible on discover with five tabs", async ({ page }) => {
    await page.goto("/discover");
    const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Trang chủ" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Khám phá" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tư vấn AI" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Thử mặc" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Hồ sơ" })).toBeVisible();
  });

  test("tab navigation reaches correct routes", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Điều hướng chính" });

    await nav.getByRole("link", { name: "Khám phá" }).click();
    await expect(page).toHaveURL(/\/discover/);

    await nav.getByRole("link", { name: "Thử mặc" }).click();
    await expect(page).toHaveURL(/\/try-on/);

    await nav.getByRole("link", { name: "Tư vấn AI" }).click();
    await expect(page).toHaveURL(/\/ai\/start/);
  });

  test("bottom nav hidden on auth and AI wizard", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toHaveCount(0);

    await page.goto("/ai/body-profile");
    await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toHaveCount(0);
  });

  test("discover filter dialog opens on mobile", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: "Bộ lọc" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bộ lọc sản phẩm" })).toBeVisible();
  });

  test("compact header shows quick search without hamburger menu", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.locator("header").getByRole("link", { name: "Tìm kiếm nhanh" })).toBeVisible();
    await expect(page.locator("header").getByRole("button", { name: "Menu" })).toHaveCount(0);
  });
});
