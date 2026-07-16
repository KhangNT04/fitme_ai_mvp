import { test, expect } from "@playwright/test";
import {
  completeConsultationToResult,
  ensureSessionViaHome,
} from "./helpers/consultation";

test.describe("Wardrobe flow", () => {
  test.setTimeout(120_000);

  test("add wardrobe item and consult with USE_WARDROBE_FIRST", async ({ page }) => {
    await ensureSessionViaHome(page);

    await page.goto("/wardrobe");
    await page.getByRole("button", { name: "Thêm item" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").first().fill("Áo thun trắng");
    await dialog.locator("select").selectOption({ index: 1 });
    await dialog.locator("input").nth(1).fill("Trắng");
    await page.getByRole("button", { name: "Lưu item" }).click();

    await expect(page.getByText("Áo thun trắng")).toBeVisible({ timeout: 15_000 });

    await completeConsultationToResult(page);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
