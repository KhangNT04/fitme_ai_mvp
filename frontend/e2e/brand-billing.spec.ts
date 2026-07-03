import { test, expect } from "@playwright/test";
import { loginBrand, loginAdmin } from "./helpers/auth";

test.describe("Brand billing", () => {
  test("brand sees plans and quota summary", async ({ page }) => {
    await loginBrand(page);
    await page.goto("/brand/billing");
    await expect(page.getByRole("heading", { name: "Gói & Thanh toán" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top-up 150 lượt" })).toBeVisible();
    await expect(page.getByText("Lượt còn lại")).toBeVisible();
  });

  test("brand mock checkout increases quota display", async ({ page }) => {
    await loginBrand(page);
    await page.goto("/brand/billing");
    const beforeText = await page.getByText("Lượt còn lại").locator("..").textContent();
    await page.getByRole("button", { name: "Mua gói" }).first().click();
    await expect(page.getByText("Thanh toán demo thành công")).toBeVisible({ timeout: 15_000 });
    await page.reload();
    const afterText = await page.getByText("Lượt còn lại").locator("..").textContent();
    expect(afterText).not.toEqual(beforeText);
  });
});

test.describe("Admin billing plans", () => {
  test("admin can view billing plans catalog", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/billing/plans");
    await expect(page.getByRole("heading", { name: "Danh mục gói" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Thêm gói" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "SUB_STARTER" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "TOPUP_150" })).toBeVisible();
  });

  test("admin can view brand billing list and detail", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/billing/brands");
    await expect(page.getByRole("heading", { name: "Gói brand đang dùng" })).toBeVisible();
    await page.getByRole("link", { name: "Chi tiết" }).first().click();
    await expect(page.getByText("Lượt còn lại")).toBeVisible();
    await expect(page.getByRole("button", { name: "Vô hiệu hóa gói" })).toBeVisible();
  });
});
