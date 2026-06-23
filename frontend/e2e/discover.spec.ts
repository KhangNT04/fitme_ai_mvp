import { test, expect } from "@playwright/test";

test.describe("Discover page", () => {
  test("loads product discovery page", async ({ page }) => {
    await page.goto("/discover");

    await expect(
      page.getByRole("heading", { name: "Khám phá sản phẩm" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Tìm kiếm sản phẩm..."),
    ).toBeVisible();
  });
});
