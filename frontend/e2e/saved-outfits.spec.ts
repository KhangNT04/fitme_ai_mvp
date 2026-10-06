import { test, expect } from "@playwright/test";
import { completeConsultationToResult } from "./helpers/consultation";
import { loginUser } from "./helpers/auth";

test.describe("Saved outfits flow", () => {
  test.setTimeout(120_000);

  test("chat outfit card → save → appears in saved list", async ({ page }) => {
    await loginUser(page);
    const recommendationId = await completeConsultationToResult(page);
    expect(recommendationId).toBeTruthy();

    const card = page.locator(`[data-recommendation-id="${recommendationId}"]`);
    const saveResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/recommendations/${recommendationId}/save`) &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );
    await card.getByRole("button", { name: "Lưu", exact: true }).click();
    await saveResponse;

    await page.goto("/saved-outfits");
    await expect(page.getByRole("heading", { name: "Đã lưu" })).toBeVisible();
    const viewLink = page.locator(`a[href^="/ai/result/${recommendationId}"]`);
    await expect(viewLink).toBeVisible({ timeout: 15_000 });

    await viewLink.click();
    await expect(page).toHaveURL(new RegExp(`/ai/result/${recommendationId}`));
  });
});
