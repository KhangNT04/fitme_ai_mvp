import { test, expect } from "@playwright/test";
import { ensureSessionViaHome } from "./helpers/consultation";

test.describe("Try-on flow", () => {
  test.setTimeout(120_000);

  test("select item → input → processing → result", async ({ page }) => {
    await ensureSessionViaHome(page);

    await page.goto("/try-on");
    await expect(page.getByRole("heading", { name: "Thử mặc bằng AI" })).toBeVisible();

    const productLink = page.getByRole("link", { name: "Xem" }).first();
    await expect(productLink).toBeVisible({ timeout: 30_000 });
    const href = await productLink.getAttribute("href");
    const productId = href?.split("/").pop();
    await page.goto(`/try-on?product=${productId}`);

    await expect(page.getByRole("button", { name: "Tiếp tục thử outfit" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
    await page.waitForURL("**/try-on/selected");
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");

    await page.getByRole("spinbutton").nth(0).fill("168");
    await page.getByRole("spinbutton").nth(1).fill("58");
    await page.getByPlaceholder("VD: M").fill("M");

    const combo = page.locator("form [role=combobox]");
    await combo.nth(0).click();
    await page.getByRole("option", { name: /Vừa vặn \(Regular\)/ }).click();
    await combo.nth(1).click();
    await page.getByRole("option", { name: "Đi cafe" }).click();
    await combo.nth(2).click();
    await page.getByRole("option", { name: "Gọn gàng" }).click();

    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();

    await page.waitForURL(/\/try-on\/(processing|result)/, { timeout: 90_000 });

    if (page.url().includes("/processing")) {
      await page.waitForURL("**/try-on/result/**", { timeout: 90_000 });
    }

    await expect(page.getByRole("heading", { name: "Kết quả thử mặc AI" })).toBeVisible();
    await expect(page.getByRole("note")).toBeVisible();
  });
});
