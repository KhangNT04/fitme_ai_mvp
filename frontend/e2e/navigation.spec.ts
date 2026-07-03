import { test, expect } from "@playwright/test";

test.describe("Header navigation", () => {
  test("main nav links reach correct pages", async ({ page }) => {
    await page.goto("/");

    await page.locator("header").getByRole("link", { name: "Khám phá", exact: true }).click();
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByRole("heading", { name: "Khám phá sản phẩm" })).toBeVisible();

    await page.locator("header").getByRole("link", { name: "Thử mặc AI" }).click();
    await expect(page).toHaveURL(/\/try-on/);

    await page.locator("header").getByRole("link", { name: "Tủ đồ" }).click();
    await expect(page).toHaveURL(/\/wardrobe/);

    await page.locator("header").getByRole("link", { name: "Đã lưu" }).click();
    await expect(page).toHaveURL(/\/saved-outfits/);
  });

  test("footer portal links load", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const brandLink = footer.getByRole("link", { name: "Brand Portal" });
    await brandLink.scrollIntoViewIfNeeded();
    await brandLink.click();
    await expect(page).toHaveURL(/\/brand\/login/, { timeout: 10_000 });

    await page.goto("/");
    const adminLink = footer.getByRole("link", { name: "Admin", exact: true });
    await adminLink.scrollIntoViewIfNeeded();
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 });
  });

  test("logo returns to home", async ({ page }) => {
    await page.goto("/discover", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Khám phá sản phẩm" })).toBeVisible();
    const logo = page.locator('header a[href="/"]');
    await logo.click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("quick search icon opens discover search", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Tìm kiếm nhanh" }).click();
    await expect(page).toHaveURL(/\/discover#discover-search/);
    const search = page.locator("[data-discover-search]").filter({ visible: true }).first();
    await expect(search).toBeVisible();
    await search.click();
    await expect(search).toBeFocused();
  });
});
