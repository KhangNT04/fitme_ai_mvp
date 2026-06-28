import { test, expect } from "@playwright/test";
import {
  fillBodyProfile,
  fillStyleProfile,
  fillOccasion,
  startAnonymousConsultation,
} from "./helpers/consultation";

test.describe("Product advice flow", () => {
  test.setTimeout(120_000);

  test("discover → product → AI consult → result with anchor context", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Khám phá sản phẩm" })).toBeVisible();

    const productLink = page.getByRole("link", { name: "Xem" }).first();
    await expect(productLink).toBeVisible({ timeout: 30_000 });
    await productLink.click();
    await page.waitForURL("**/products/**");

    await page.getByRole("button", { name: /Tư vấn size & phối đồ bằng AI/ }).click();
    await fillBodyProfile(page);
    await fillStyleProfile(page);
    await fillOccasion(page);

    await page.waitForURL("**/ai/processing**", { timeout: 30_000 }).catch(() => {});
    await page.waitForURL("**/ai/result/**", { timeout: 90_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Giải thích AI/)).toBeVisible();
  });
});
