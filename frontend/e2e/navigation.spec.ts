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
    const brandLink = page.getByRole("link", { name: "Brand Portal" });
    await brandLink.scrollIntoViewIfNeeded();
    await brandLink.click();
    await expect(page).toHaveURL(/\/brand\/login/);

    await page.goto("/");
    const adminLink = page.getByRole("link", { name: "Admin", exact: true });
    await adminLink.scrollIntoViewIfNeeded();
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logo returns to home", async ({ page }) => {
    await page.goto("/discover");
    await page.locator("header").getByRole("link", { name: "FitMe AI" }).click();
    await expect(page).toHaveURL("/");
  });
});
