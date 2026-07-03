import { test, expect } from "@playwright/test";
import { loginBrand } from "./helpers/auth";
import { fillBrandProductForm } from "./helpers/brand";
import { BRAND_PAGES, expectPageHeading } from "./helpers/portal";

test.describe.configure({ mode: "serial" });

test.describe("Brand portal — full coverage", () => {
  test.beforeEach(async ({ page }) => {
    await loginBrand(page);
  });

  for (const { path, heading } of BRAND_PAGES) {
    test(`${path} loads when authenticated`, async ({ page }) => {
      await expectPageHeading(page, path, heading);
    });
  }

  test("create product → appears in list with DRAFT status", async ({ page }) => {
    const productName = `E2E Brand Product ${Date.now()}`;

    await page.goto("/brand/products/new");
    await fillBrandProductForm(page, productName);
    await page.getByRole("button", { name: "Tạo sản phẩm" }).click();

    await expect(page.getByRole("button", { name: "Gửi duyệt" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Gửi duyệt" }).click();
    await page.waitForURL(/\/brand\/products$/);
    await expect(page.getByRole("cell", { name: productName })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Chờ duyệt").first()).toBeVisible();
  });

  test("edit product → submit for review → PENDING_REVIEW", async ({ page }) => {
    const productName = `E2E Submit ${Date.now()}`;

    await page.goto("/brand/products/new");
    await fillBrandProductForm(page, productName, "https://shopee.vn/e2e-submit");
    await page.getByRole("button", { name: "Tạo sản phẩm" }).click();
    await expect(page.getByRole("button", { name: "Gửi duyệt" })).toBeVisible({ timeout: 15_000 });

    const submitResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/submit-review") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );
    await page.getByRole("button", { name: "Gửi duyệt" }).click();
    await submitResponse;
    await page.waitForURL(/\/brand\/products$/);
    await expect(page.getByRole("cell", { name: productName })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Chờ duyệt").first()).toBeVisible();
  });

  test("product analytics page loads for existing product", async ({ page }) => {
    await page.goto("/brand/products");
    const analyticsLink = page.locator("tbody tr").first().getByRole("link", { name: "Phân tích" });
    await expect(analyticsLink).toBeVisible({ timeout: 15_000 });
    await analyticsLink.click();
    await expect(page).toHaveURL(/\/brand\/products\/[^/]+\/analytics/);
    await expect(page.getByRole("heading", { name: "Phân tích sản phẩm" })).toBeVisible();
  });
});
