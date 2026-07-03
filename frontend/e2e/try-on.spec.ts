import { test, expect } from "@playwright/test";
import { getFirstProductIdFromTryOnHub, fillTryOnInputMetrics, waitForTryOnResult } from "./helpers/tryon";
import { ensureSessionViaHome } from "./helpers/consultation";

test.describe("Try-on flow", () => {
  test.setTimeout(120_000);

  test("select item → input → processing → result", async ({ page }) => {
    await ensureSessionViaHome(page);
    const productId = await getFirstProductIdFromTryOnHub(page);

    await page.goto(`/try-on?product=${productId}`);
    await expect(page.getByText(/Đã chọn \(\d+\)/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
    await page.waitForURL("**/try-on/selected");
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");

    await fillTryOnInputMetrics(page);

    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();

    await waitForTryOnResult(page);

    await expect(page.getByRole("heading", { name: "Kết quả thử mặc AI" })).toBeVisible();
    await expect(page.getByRole("note")).toBeVisible();
  });

  test("avatar mode → processing → result", async ({ page }) => {
    await ensureSessionViaHome(page);
    const productId = await getFirstProductIdFromTryOnHub(page);
    await page.goto(`/try-on?product=${productId}`);

    await expect(page.getByText(/Đã chọn \(\d+\)/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
    await page.waitForURL("**/try-on/selected");
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");

    await expect(page.getByRole("spinbutton").first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Dùng avatar mẫu" }).click();
    await page.locator("button").filter({ hasText: /^Nữ 1$/ }).click();

    await fillTryOnInputMetrics(page);

    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
    await waitForTryOnResult(page);

    await expect(page.getByRole("heading", { name: "Kết quả thử mặc AI" })).toBeVisible();
    await expect(page.getByText(/Avatar mẫu|Outfit board/).first()).toBeVisible();
  });
});
