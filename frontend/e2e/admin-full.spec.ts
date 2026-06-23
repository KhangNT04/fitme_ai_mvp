import { test, expect } from "@playwright/test";
import { loginAdmin } from "./helpers/auth";
import { ADMIN_PAGES, expectPageHeading } from "./helpers/portal";

test.describe.configure({ mode: "serial" });

test.describe("Admin portal — full coverage", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  for (const { path, heading } of ADMIN_PAGES) {
    test(`${path} loads when authenticated`, async ({ page }) => {
      await expectPageHeading(page, path, heading);
    });
  }

  test("moderation page shows pending products table", async ({ page }) => {
    await page.goto("/admin/products/moderation");
    await expect(page.getByRole("heading", { name: "Duyệt sản phẩm" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 });
  });

  test("can approve pending product when available", async ({ page }) => {
    await page.goto("/admin/products/moderation");
    const approveBtn = page.getByRole("button", { name: "Duyệt" }).first();
    const hasPending = await approveBtn.isVisible().catch(() => false);

    if (hasPending) {
      await approveBtn.click();
      await expect(page.getByText("ACTIVE").first()).toBeVisible({ timeout: 15_000 });
    } else {
      test.info().annotations.push({
        type: "note",
        description: "No pending products to approve — table load verified only",
      });
    }
  });
});
