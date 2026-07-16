import { test, expect } from "@playwright/test";
import { completeConsultationToResult } from "./helpers/consultation";

test.describe.configure({ mode: "serial" });

test.describe("AI chat outfit actions", () => {
  test.setTimeout(180_000);

  test("variants and similar products from chat recommendation", async ({ page }) => {
    const recommendationId = await completeConsultationToResult(page);
    expect(recommendationId).toBeTruthy();

    await page.goto(`/ai/variants/${recommendationId}`);
    await expect(page.getByRole("heading", { name: "Thử biến thể" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "So sánh size" })).toBeVisible();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/similar-products") && r.status() < 500,
      { timeout: 30_000 },
    );
    await page.goto(`/similar-products?recommendation=${recommendationId}`);
    await responsePromise;

    await expect(page.getByRole("heading", { name: "Sản phẩm tương tự" })).toBeVisible();
  });

  test("mặc thử outfit navigates to try-on input", async ({ page }) => {
    await completeConsultationToResult(page);
    await page.getByRole("button", { name: "Mặc thử outfit" }).first().click();
    await page.waitForURL("**/try-on/input", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /thông tin|thử mặc/i }).or(
      page.getByText(/Tạo preview thử mặc|Gu mặc/),
    )).toBeVisible({ timeout: 15_000 });
  });
});
