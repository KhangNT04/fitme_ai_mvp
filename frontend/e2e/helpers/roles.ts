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
  const inputs = page.locator("form input");
  await inputs.nth(0).fill(options?.fullName ?? "E2E Test User");
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill(password);
  await inputs.nth(3).fill(password);
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await page.waitForURL(new RegExp(redirect.replace(/\//g, "\\/")), { timeout: 30_000 });
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
