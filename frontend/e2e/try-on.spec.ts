import { test, expect } from "@playwright/test";
import { getFirstProductIdFromTryOnHub, fillTryOnInputMetrics, waitForTryOnResult } from "./helpers/tryon";
import { ensureSessionViaHome } from "./helpers/consultation";
import { loginUser } from "./helpers/auth";

test.describe("Try-on flow", () => {
  test.setTimeout(120_000);

  test("select item → input → processing → result", async ({ page }) => {
    await loginUser(page);
    const productId = await getFirstProductIdFromTryOnHub(page);

    await page.goto(`/try-on?product=${productId}`);
    await expect(page.getByText(/Đã chọn \(\d+\)/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
    await page.waitForURL("**/try-on/selected");
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");

    await fillTryOnInputMetrics(page);

    // Default preview mode ("Chỉ xem outfit board") is locked — CTA shows a toast, no navigation.
    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
    await expect(
      page.getByRole("status").filter({
        hasText: "Tính năng đang được phát triển, hiện tại chưa thể sử dụng.",
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/try-on\/input/);

    // Switching to "Dùng ảnh cá nhân" unlocks the flow.
    await page.getByRole("button", { name: "Dùng ảnh cá nhân" }).click();
    await page.getByRole("checkbox").click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "tryon-fixture.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await expect(page.getByText(/Ảnh đạt chất lượng tốt/i)).toBeVisible({ timeout: 30_000 });

    // Metrics typed before switching mode and uploading must survive.
    await expect(page.getByRole("spinbutton").nth(0)).toHaveValue("168");
    await expect(page.getByRole("spinbutton").nth(1)).toHaveValue("58");
    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();

    await waitForTryOnResult(page);

    await expect(page.getByRole("heading", { name: "Kết quả thử mặc AI" })).toBeVisible();
    await expect(page.getByRole("note")).toBeVisible();
  });

  test("avatar mode asks guests to log in; outfit-board-only mode stays locked", async ({ page }) => {
    await ensureSessionViaHome(page);
    const productId = await getFirstProductIdFromTryOnHub(page);
    await page.goto(`/try-on?product=${productId}`);

    await expect(page.getByText(/Đã chọn \(\d+\)/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
    await page.waitForURL("**/try-on/selected");
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");

    await expect(page.getByRole("spinbutton").first()).toBeVisible({ timeout: 30_000 });

    const lockedToast = page.getByRole("status").filter({
      hasText: "Tính năng đang được phát triển, hiện tại chưa thể sử dụng.",
    });

    // Avatar mode is available; a guest is asked to log in before any Fitken is spent.
    await page.getByRole("button", { name: "Dùng avatar mẫu" }).click();
    await page.locator("button").filter({ hasText: /^Nữ 1$/ }).click();
    await fillTryOnInputMetrics(page);
    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
    const loginDialog = page.getByRole("dialog", { name: "Đăng nhập để tiếp tục" });
    await expect(loginDialog).toBeVisible();
    await expect(lockedToast).toHaveCount(0);
    await expect(page).toHaveURL(/\/try-on\/input/);
    await page.keyboard.press("Escape");
    await expect(loginDialog).toHaveCount(0);

    // Outfit-board-only mode: tab is selectable, but the CTA is locked.
    await page.getByRole("button", { name: "Chỉ xem outfit board" }).click();
    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
    await expect(lockedToast).toBeVisible();
    await expect(page).toHaveURL(/\/try-on\/input/);
  });

  test("user photo mode → upload → processing → result", async ({ page }) => {
    await loginUser(page);
    const productId = await getFirstProductIdFromTryOnHub(page);
    await page.goto(`/try-on?product=${productId}`);

    await expect(page.getByText(/Đã chọn \(\d+\)/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
    await page.waitForURL("**/try-on/selected");
    await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
    await page.waitForURL("**/try-on/input");

    await page.getByRole("button", { name: "Dùng ảnh cá nhân" }).click();
    await page.getByRole("checkbox").click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "tryon-fixture.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await expect(page.getByText(/Ảnh đạt chất lượng tốt/i)).toBeVisible({ timeout: 30_000 });

    await fillTryOnInputMetrics(page);
    await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
    await waitForTryOnResult(page);

    await expect(page.getByRole("heading", { name: "Kết quả thử mặc AI" })).toBeVisible();
    await expect(page.getByText(/Ảnh của bạn|Minh họa trên ảnh|Ảnh thử mặc AI/).first()).toBeVisible();
    await expect(page.locator('img[alt="Try-on preview"]')).toBeVisible();
  });
});
