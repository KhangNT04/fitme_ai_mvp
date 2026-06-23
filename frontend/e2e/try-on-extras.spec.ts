import { test, expect, type Page } from "@playwright/test";
import { ensureSessionViaHome } from "./helpers/consultation";

async function completeTryOnToResult(page: Page): Promise<string> {
  await ensureSessionViaHome(page);

  await page.goto("/try-on");
  const productLink = page.getByRole("link", { name: "Xem" }).first();
  await expect(productLink).toBeVisible({ timeout: 30_000 });
  const href = await productLink.getAttribute("href");
  const productId = href?.split("/").pop();
  await page.goto(`/try-on?product=${productId}`);

  await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
  await page.waitForURL(/\/try-on\/selected/);
  await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
  await page.waitForURL(/\/try-on\/input/);

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
    await page.waitForURL(/\/try-on\/result\//, { timeout: 90_000 });
  }

  const tryOnId = page.url().split("/").pop()!;
  return tryOnId;
}

test.describe("Try-on sub-pages", () => {
  test.setTimeout(180_000);

  test("color, size, form comparison pages load from result", async ({ page }) => {
    const tryOnId = await completeTryOnToResult(page);

    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/color/${tryOnId}`)),
      page.getByRole("link", { name: "Thử màu khác" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "So sánh màu" })).toBeVisible();

    await page.goto(`/try-on/result/${tryOnId}`);
    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/size/${tryOnId}`)),
      page.getByRole("link", { name: "Thử size khác" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "So sánh size" })).toBeVisible();

    await page.goto(`/try-on/result/${tryOnId}`);
    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/form/${tryOnId}`)),
      page.getByRole("link", { name: "Thử form khác" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "So sánh form" })).toBeVisible();
  });

  test("decision page loads from result", async ({ page }) => {
    const tryOnId = await completeTryOnToResult(page);

    await Promise.all([
      page.waitForURL(new RegExp(`/try-on/decision/${tryOnId}`)),
      page.getByRole("link", { name: "Quyết định tiếp theo" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Quyết định tiếp theo" })).toBeVisible();
  });
});
