import { test, expect } from "@playwright/test";

test.describe("Redirect flow", () => {
  test.setTimeout(60_000);

  test("redirect loading page shows status message", async ({ page }) => {
    await page.goto("/redirect/loading?url=https%3A%2F%2Fexample.com");

    await expect(
      page.getByRole("heading", { name: "Đang chuyển hướng..." }),
    ).toBeVisible();
    await expect(
      page.getByText("Bạn sẽ được chuyển đến trang bán hàng trong giây lát"),
    ).toBeVisible();
  });

  test("product confirm → loading page with external URL", async ({ page }) => {
    await page.goto("/discover");

    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible({ timeout: 30_000 });
    const href = await productLink.getAttribute("href");
    expect(href).toMatch(/^\/products\//);

    await page.goto(href!);
    await page.getByRole("link", { name: "Mua ngay" }).click();
    await page.waitForURL("**/redirect/confirm/**");

    await expect(page.getByRole("heading", { name: "Xác nhận chuyển hướng" })).toBeVisible();
    await page.getByRole("button", { name: "Tiếp tục đến nơi bán" }).click();

    await page.waitForURL("**/redirect/loading**", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Đang chuyển hướng..." })).toBeVisible();
    expect(page.url()).toMatch(/url=/);
  });
});
