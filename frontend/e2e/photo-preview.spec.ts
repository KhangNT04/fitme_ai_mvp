import { test, expect } from "@playwright/test";
import { completeConsultationToResult } from "./helpers/consultation";
import { AI_DISCLAIMER } from "../src/utils/constants";

test.describe("Photo preview flow", () => {
  test.setTimeout(180_000);

  test("chat outfit → photo upload consent and disclaimer visible", async ({ page }) => {
    const recommendationId = await completeConsultationToResult(page);
    expect(recommendationId).toBeTruthy();

    await page.goto(`/ai/photo-upload?recommendation=${recommendationId}`);

    await expect(page.getByRole("heading", { name: "Upload ảnh preview 2D" })).toBeVisible();
    await expect(page.getByRole("note")).toBeVisible();
    await expect(page.getByText(AI_DISCLAIMER)).toBeVisible();

    const uploadButton = page.getByRole("button", { name: /Kéo thả hoặc chọn ảnh/ });
    await expect(uploadButton).toBeDisabled();

    await page.getByRole("checkbox").click();
    await expect(uploadButton).toBeEnabled();
  });
});
