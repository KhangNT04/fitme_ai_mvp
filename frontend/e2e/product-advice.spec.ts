import { test, expect } from "@playwright/test";
import { fillBodyProfile } from "./helpers/consultation";
import { getFirstProductIdFromDiscover } from "./helpers/tryon";

test.describe("Product advice flow", () => {
  test.setTimeout(180_000);

  test("discover → product → AI consult → chat", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Khám phá sản phẩm" })).toBeVisible();

    const productId = await getFirstProductIdFromDiscover(page);
    await page.goto(`/products/${productId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Tư vấn size & phối đồ bằng AI/ }).click();
    await page.waitForURL(/\/ai\/(body-profile|chat|start)/);

    if (page.url().includes("body-profile")) {
      await fillBodyProfile(page);
    }

    await page.waitForURL("**/ai/chat", { timeout: 30_000 });
    await expect(page.getByText(/Bạn muốn tôi phối đồ|Tư vấn outfit AI/)).toBeVisible();
  });
});
