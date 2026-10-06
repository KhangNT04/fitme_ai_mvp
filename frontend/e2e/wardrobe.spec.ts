import { test, expect } from "@playwright/test";
import { completeConsultationToResult, ensureSessionViaHome } from "./helpers/consultation";
import { loginPremiumUser } from "./helpers/auth";

test.describe("Wardrobe flow", () => {
  test.setTimeout(120_000);

  test("Premium user adds a wardrobe item and consults with the wardrobe", async ({ page }) => {
    const itemName = `Áo thun trắng ${Date.now()}`;
    await loginPremiumUser(page);

    await page.goto("/wardrobe");
    await page.getByRole("button", { name: "Thêm item", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").first().fill(itemName);
    await dialog.locator("select").selectOption({ index: 1 });
    await dialog.locator("input").nth(1).fill("Trắng");
    await page.getByRole("button", { name: "Lưu item" }).click();

    await expect(page.getByText(itemName).first()).toBeVisible({ timeout: 15_000 });

    await completeConsultationToResult(page);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Free visitors see the Premium upsell instead of the wardrobe", async ({ page }) => {
    await ensureSessionViaHome(page);

    await page.goto("/wardrobe");
    await expect(page.getByTestId("wardrobe-premium-upsell")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Tủ đồ là tính năng của FitMe Premium" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm item", exact: true })).toHaveCount(0);
  });
});
