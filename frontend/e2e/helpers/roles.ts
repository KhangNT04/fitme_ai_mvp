import { type Page, expect } from "@playwright/test";
import { DEMO_PASSWORD } from "./auth";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}@test.fitme.ai`;
}

export async function registerUser(
  page: Page,
  email: string,
  options?: { fullName?: string; password?: string; redirect?: string },
) {
  const password = options?.password ?? DEMO_PASSWORD;
  const redirect = options?.redirect ?? "/profile";
  await page.goto(`/auth/register?redirect=${encodeURIComponent(redirect)}`);
  await expect(page.getByRole("heading", { name: "Đăng ký tài khoản" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByLabel("Họ tên", { exact: true }).fill(options?.fullName ?? "E2E Test User");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(password);

  const captchaQuestion = page.locator("form p.text-sm.text-muted-foreground").filter({ hasText: "=" });
  await expect(captchaQuestion).toBeVisible({ timeout: 15_000 });
  const questionText = (await captchaQuestion.innerText()).trim();
  const parts = questionText.replace("= ?", "").split("+");
  const answer = String(Number(parts[0].trim()) + Number(parts[1].trim()));
  await page.getByPlaceholder("Nhập kết quả").fill(answer);

  // Anti-bot timing — production default is 2s; CI backend uses FITME_AUTH_MIN_FORM_MS=0
  await page.waitForTimeout(process.env.CI ? 100 : 2200);
  await page.getByRole("button", { name: /Đăng ký/ }).click();

  await expect(page.getByRole("heading", { name: "Xác nhận tài khoản" })).toBeVisible({
    timeout: 30_000,
  });
  const codeInput = page.getByPlaceholder("123456");
  await expect(codeInput).not.toHaveValue("", { timeout: 15_000 });
  await page.getByRole("button", { name: /Xác nhận/ }).click();
  const escaped = redirect.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.waitForURL(new RegExp(escaped), { timeout: 30_000 });
}

export async function submitBrandApplication(
  page: Page,
  brandName: string,
  contactEmail: string,
) {
  await page.goto("/brand/onboarding");
  await expect(page.getByRole("heading", { name: "Đăng ký đối tác Brand" })).toBeVisible();
  await page.getByText("Tên thương hiệu").locator("..").locator("input").fill(brandName);
  await page.getByText("Email liên hệ").locator("..").locator("input").fill(contactEmail);
  await page.getByText("Website").locator("..").locator("input").fill("https://example.com");
  await page.getByText("Mô tả thương hiệu").locator("..").locator("input").fill("E2E brand application test");
  await page.getByRole("button", { name: "Gửi đơn đăng ký" }).click();
  await page.waitForURL(/\/brand\/pending/, { timeout: 30_000 });
  await expect(page.getByText(brandName)).toBeVisible();
  await expect(page.getByText("Chờ duyệt")).toBeVisible();
}

export async function approveBrandAsAdmin(page: Page, brandName: string) {
  page.once("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/brands");
  await expect(page.getByRole("heading", { name: "Quản lý thương hiệu" })).toBeVisible();
  const row = page.locator("tbody tr", { hasText: brandName });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: "Duyệt" }).click();
  await expect(row.getByText("APPROVED")).toBeVisible({ timeout: 15_000 });
}
