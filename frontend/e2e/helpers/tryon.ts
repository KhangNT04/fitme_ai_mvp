import { type Page, expect } from "@playwright/test";
import { ensureSessionViaHome } from "./consultation";

export async function getFirstProductIdFromTryOnHub(page: Page): Promise<string> {
  await page.goto("/try-on");
  await expect(page.getByRole("heading", { name: "Thử mặc bằng AI" })).toBeVisible();

  const productLink = page.locator('a[href^="/products/"]').first();
  await expect(productLink).toBeVisible({ timeout: 30_000 });
  const href = await productLink.getAttribute("href");
  const productId = href?.match(/\/products\/([^/?]+)/)?.[1];
  if (!productId) {
    throw new Error("Could not resolve product id from try-on hub");
  }
  return productId;
}

export async function getFirstProductIdFromDiscover(page: Page): Promise<string> {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Khám phá sản phẩm" })).toBeVisible();

  const productLink = page.locator('a[href^="/products/"]').first();
  await expect(productLink).toBeVisible({ timeout: 30_000 });
  const href = await productLink.getAttribute("href");
  const productId = href?.match(/\/products\/([^/?]+)/)?.[1];
  if (!productId) {
    throw new Error("Could not resolve product id from discover");
  }
  return productId;
}

/** Fill body metrics on try-on input. */
export async function fillTryOnInputMetrics(page: Page) {
  await page.getByRole("spinbutton").nth(0).fill("168");
  await page.getByRole("spinbutton").nth(1).fill("58");
  await page.getByPlaceholder("VD: M").fill("M");

  const fitCombo = page.locator("form [role=combobox]").first();
  await fitCombo.click();
  await page.getByRole("option", { name: /Vừa vặn \(Regular\)/ }).click();
}

export async function waitForTryOnResult(page: Page) {
  await page.waitForURL(/\/try-on\/(processing|result)/, { timeout: 90_000 });
  if (page.url().includes("/processing")) {
    await page.waitForURL(/\/try-on\/result\//, { timeout: 90_000 });
  }
}

/**
 * "Chỉ xem outfit board" (the try-on form's default input mode) is locked behind a
 * "feature not available" toast — only "Dùng ảnh cá nhân" is demo-ready end-to-end.
 * Switches to that mode, gives consent, and uploads a fixture photo so the CTA is
 * unlocked. Must run before fillTryOnInputMetrics, since uploading resets the
 * reactive form defaults.
 */
export async function selectUserPhotoModeAndUpload(page: Page) {
  await page.getByRole("button", { name: "Dùng ảnh cá nhân" }).click();
  await page.getByRole("checkbox").click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "tryon-fixture.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await expect(page.getByText(/Ảnh đạt chất lượng tốt/i)).toBeVisible({ timeout: 30_000 });
}

/** Select first eligible product and open the selected-outfit step. */
export async function startTryOnWithFirstProduct(page: Page): Promise<string> {
  await ensureSessionViaHome(page);
  const productId = await getFirstProductIdFromTryOnHub(page);

  await page.goto(`/try-on?product=${productId}`);
  await expect(page.getByText(/Đã chọn \(\d+\)/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Tiếp tục thử outfit" }).click();
  await page.waitForURL(/\/try-on\/selected/);

  return productId;
}

export async function completeTryOnToResult(page: Page): Promise<string> {
  await startTryOnWithFirstProduct(page);
  await page.getByRole("button", { name: "Tiếp tục nhập thông tin" }).click();
  await page.waitForURL(/\/try-on\/input/);

  await selectUserPhotoModeAndUpload(page);
  await fillTryOnInputMetrics(page);
  await page.getByRole("button", { name: "Tạo preview thử mặc" }).click();
  await waitForTryOnResult(page);

  return page.url().split("/").pop()!;
}
