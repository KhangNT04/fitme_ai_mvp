import { test, expect } from "@playwright/test";

test.describe("Redirect flow", () => {
  test.setTimeout(60_000);

  test("loading page ignores a url query param (no open redirect)", async ({ page }) => {
    await page.goto("/redirect/loading?url=https%3A%2F%2Fexample.com");

    await expect(page.getByRole("heading", { name: "Liên kết không hợp lệ" })).toBeVisible();
    await page.waitForTimeout(3_000);
    expect(new URL(page.url()).hostname).not.toBe("example.com");
  });

  test("product confirm → loading page with external URL", async ({ page }) => {
    await page.goto("/discover");

    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible({ timeout: 30_000 });
    const href = await productLink.getAttribute("href");
    expect(href).toMatch(/^\/products\//);

    await page.goto(href!);
    // In-app purchasable products demote the external shop link to "Mua tại cửa hàng gốc".
    await page
      .getByRole("link", { name: /^(Mua ngay|Mua tại cửa hàng gốc)$/ })
      .filter({ visible: true })
      .first()
      .click();
    await page.waitForURL("**/redirect/confirm/**");

    await expect(page.getByRole("heading", { name: "Xác nhận chuyển hướng" })).toBeVisible();
    await page.getByRole("button", { name: "Tiếp tục đến nơi bán" }).click();

    await page.waitForURL("**/redirect/loading**", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Đang chuyển hướng..." })).toBeVisible();
    expect(page.url()).toMatch(/event=/);
    expect(page.url()).not.toMatch(/url=/);
  });
});
