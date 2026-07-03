import { test, expect } from "@playwright/test";
import { completeConsultationToResult } from "./helpers/consultation";

test.describe.configure({ mode: "serial" });

test.describe("AI result sub-pages", () => {
  test.setTimeout(120_000);

  test("variants page shows size/form comparison", async ({ page }) => {
    await completeConsultationToResult(page);
    const recommendationId = page.url().split("/").pop();

    await page.goto(`/ai/variants/${recommendationId}`);
    await expect(page.getByRole("heading", { name: "Thử biến thể" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "So sánh size" })).toBeVisible();
    await expect(page.getByRole("note")).toBeVisible();
  });

  test("similar products page loads from recommendation", async ({ page }) => {
    await completeConsultationToResult(page);
    const recommendationId = page.url().split("/").pop();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/similar-products") && r.status() < 500,
      { timeout: 30_000 },
    );
    await page.goto(`/similar-products?recommendation=${recommendationId}`);
    await responsePromise;

    await expect(page.getByRole("heading", { name: "Sản phẩm tương tự" })).toBeVisible();
    await expect(
      page.locator('a[href^="/products/"]').first().or(
        page.getByRole("heading", { name: "Không tìm thấy sản phẩm tương tự" }),
      ).or(page.getByRole("heading", { name: "Đã xảy ra lỗi" })),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("result page action links navigate correctly", async ({ page }) => {
    await completeConsultationToResult(page);
    const recommendationId = page.url().split("/").pop();

    await expect(page.getByRole("link", { name: /Thử biến thể/ })).toHaveAttribute(
      "href",
      `/ai/variants/${recommendationId}`,
    );
    await expect(page.getByRole("link", { name: /Upload ảnh tạo preview/ })).toHaveAttribute(
      "href",
      `/ai/preview-outfit?recommendation=${recommendationId}`,
    );

    await page.goto(`/ai/variants/${recommendationId}`);
    await expect(page.getByRole("heading", { name: "Thử biến thể" })).toBeVisible();

    await page.goto(`/ai/preview-outfit?recommendation=${recommendationId}`);
    await expect(page.getByRole("heading", { name: "Chỉnh set outfit" })).toBeVisible();
  });
});
