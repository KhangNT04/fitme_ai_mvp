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

  test("billing plans page splits consumer and brand plans into tabs", async ({ page }) => {
    await page.goto("/admin/billing/plans");
    const consumerTab = page.getByRole("tab", { name: "Gói người dùng" });
    const brandTab = page.getByRole("tab", { name: "Gói brand" });
    await expect(consumerTab).toBeVisible();
    await expect(brandTab).toBeVisible();
    await brandTab.click();
    await expect(page).toHaveURL(/tab=brand/);
    await expect(page.getByRole("heading", { name: "Brand đã mua Plus" })).toBeVisible({ timeout: 15_000 });
  });

  test("moderation page shows pending products table or empty state", async ({ page }) => {
    await page.goto("/admin/products/moderation");
    await expect(page.getByRole("heading", { name: "Duyệt sản phẩm" })).toBeVisible();
    await expect(
      page.locator("table").or(page.getByText("Không có sản phẩm chờ duyệt.")),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("can approve pending product when available", async ({ page }) => {
    await page.goto("/admin/products/moderation");
    const approveBtn = page.getByRole("button", { name: "Duyệt" }).first();
    const hasPending = await approveBtn.isVisible().catch(() => false);

    if (hasPending) {
      await approveBtn.click();
      await expect(page.getByText("Đã duyệt sản phẩm").first()).toBeVisible({ timeout: 15_000 });
    } else {
      test.info().annotations.push({
        type: "note",
        description: "No pending products to approve — table load verified only",
      });
    }
  });
});
