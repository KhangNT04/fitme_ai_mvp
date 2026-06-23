import { test, expect } from "@playwright/test";
import { completeConsultationToResult } from "./helpers/consultation";

test.describe("Saved outfits flow", () => {
  test.setTimeout(120_000);

  test("consultation → save → appears in saved list", async ({ page }) => {
    await completeConsultationToResult(page);

    const title = await page.getByRole("heading", { level: 1 }).textContent();
    expect(title).toBeTruthy();

    const saveResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/recommendations/") &&
        resp.url().includes("/save") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );
    await page.getByRole("button", { name: "Lưu gợi ý" }).click();
    await saveResponse;

    await page.goto("/saved-outfits");
    await expect(page.getByRole("heading", { name: "Gợi ý đã lưu" })).toBeVisible();
    await expect(page.getByText(title!)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Xem" })).toBeVisible();

    await page.getByRole("link", { name: "Xem" }).first().click();
    await expect(page).toHaveURL(/\/ai\/result\//);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title!);
  });
});
