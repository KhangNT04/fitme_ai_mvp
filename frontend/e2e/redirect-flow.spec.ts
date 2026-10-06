import { test, expect } from "@playwright/test";
import { loginUser } from "./helpers/auth";
import { getFirstProductIdFromDiscover } from "./helpers/tryon";

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
    await page
      .getByRole("link", { name: "Mua tại cửa hàng gốc" })
      .filter({ visible: true })
      .first()
      .click();
    await page.waitForURL("**/redirect/confirm/**");

    await expect(page.getByRole("heading", { name: "Xác nhận chuyển hướng" })).toBeVisible();
    await expect(page.getByTestId("lead-sharing-login-hint")).toBeVisible();
    await expect(page.getByTestId("lead-sharing-consent")).toHaveCount(0);
    await page.getByRole("button", { name: "Tiếp tục đến nơi bán" }).click();

    await page.waitForURL("**/redirect/loading**", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Đang chuyển hướng..." })).toBeVisible();
    expect(page.url()).toMatch(/event=/);
    expect(page.url()).not.toMatch(/url=/);
  });

  test("logged-in confirm page toggles the brand lead sharing consent", async ({ page }) => {
    await loginUser(page);
    const productId = await getFirstProductIdFromDiscover(page);
    await page.goto(`/redirect/confirm/${productId}`);

    await expect(page.getByRole("heading", { name: "Xác nhận chuyển hướng" })).toBeVisible();
    await expect(page.getByTestId("lead-sharing-login-hint")).toHaveCount(0);
    const consent = page.getByTestId("lead-sharing-consent");
    await expect(consent).toBeEnabled({ timeout: 15_000 });
    const initial = await consent.getAttribute("aria-checked");
    const flipped = initial === "true" ? "false" : "true";

    for (const expected of [flipped, initial]) {
      const saved = page.waitForResponse(
        (resp) => resp.url().includes("/privacy/consent") && resp.request().method() === "POST",
      );
      await consent.click();
      await expect(consent).toHaveAttribute("aria-checked", expected!);
      expect((await saved).ok()).toBe(true);
    }
  });
});
