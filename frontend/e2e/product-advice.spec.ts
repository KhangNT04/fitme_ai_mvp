import { test, expect } from "@playwright/test";
import { ensureReachedAiChat } from "./helpers/consultation";
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
    await ensureReachedAiChat(page);
  });
});
