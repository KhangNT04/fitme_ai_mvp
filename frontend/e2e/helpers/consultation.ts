import { type Page, expect } from "@playwright/test";

/** Creates anonymous session via home CTA and navigates to AI start. */
export async function startAnonymousConsultation(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu tư vấn outfit" }).first().click();
  await page.waitForURL("**/ai/start");
  await page.waitForFunction(
    () => localStorage.getItem("fitme_session_token") !== null,
    undefined,
    { timeout: 15_000 },
  );
}

export async function fillBodyProfile(page: Page) {
  await page.goto("/ai/body-profile");
  await page.getByLabel("Chiều cao (cm)").fill("165");
  await page.getByLabel("Cân nặng (kg)").fill("55");
  await page.getByText("Tổng thể cân đối hơn").click();

  const comboboxes = page.locator("form [role=combobox]");
  await comboboxes.nth(0).click();
  await page.getByRole("option", { name: "Nữ", exact: true }).click();
  await comboboxes.nth(1).click();
  await page.getByRole("option", { name: /Vừa vặn \(Regular\)/ }).click();
  await comboboxes.nth(2).click();
  await page.getByRole("option", { name: "Trung bình" }).click();

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.waitForURL("**/ai/style-profile");
}

export async function fillStyleProfile(page: Page) {
  await page.getByRole("button", { name: "Minimal", exact: true }).click();
  await page.getByRole("button", { name: "Đen", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.waitForURL("**/ai/occasion");
}

export async function fillOccasion(page: Page, wardrobeModeLabel?: string) {
  await page.getByRole("button", { name: "Đi cafe", exact: true }).click();
  await page.getByRole("button", { name: "Gọn gàng", exact: true }).click();

  if (wardrobeModeLabel) {
    await page.locator('[role="combobox"]').last().click();
    await page.getByRole("option", { name: wardrobeModeLabel }).click();
  }

  await page.getByRole("button", { name: "Tạo gợi ý outfit" }).click();
}

/** Full anonymous consultation through processing to result page. */
export async function completeConsultationToResult(
  page: Page,
  options?: { wardrobeModeLabel?: string },
) {
  await startAnonymousConsultation(page);
  await page.getByRole("button", { name: "Bắt đầu nhập thông tin" }).click();
  await fillBodyProfile(page);
  await fillStyleProfile(page);
  await fillOccasion(page, options?.wardrobeModeLabel);

  await page.waitForURL(/\/ai\/processing/, { timeout: 30_000 });
  await page.waitForURL(/\/ai\/result\//, { timeout: 90_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export async function ensureSessionViaHome(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu tư vấn outfit" }).first().click();
  await page.waitForURL("**/ai/start");
}
