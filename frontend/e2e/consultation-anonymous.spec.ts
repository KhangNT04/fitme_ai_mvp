import { test, expect } from "@playwright/test";
import { completeConsultationToResult } from "./helpers/consultation";

test.describe("Anonymous consultation flow", () => {
  test("home page loads with outfit consultation CTA", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Đúng size, hợp dáng, chuẩn màu — thử trước khi mua.",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Bắt đầu tư vấn outfit" }).first(),
    ).toBeVisible();
  });

  test("full flow: body → style → occasion → result with size badges", async ({ page }) => {
    test.setTimeout(120_000);
    await completeConsultationToResult(page);

    await expect(page.getByText(/Gợi ý size:/).first()).toBeVisible();
    await expect(page.getByText(/Form:/).first()).toBeVisible();
    await expect(page.getByText(/Màu:/).first()).toBeVisible();
    await expect(page.getByRole("note")).toBeVisible();
  });
});
