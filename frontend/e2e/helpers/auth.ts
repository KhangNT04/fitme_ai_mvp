import { type Page, expect } from "@playwright/test";

export const DEMO_PASSWORD = "fitme123";

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
}

export async function loginBrand(page: Page, email = "brand@fitme.ai") {
  await page.goto("/brand/login");
  await fillLoginForm(page, email, DEMO_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(/\/brand\/dashboard/, { timeout: 30_000 });
}

export async function loginAdmin(page: Page, email = "admin@fitme.ai") {
  await page.goto("/admin/login");
  await fillLoginForm(page, email, DEMO_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 });
}

export async function loginUser(page: Page, email = "user@fitme.ai") {
  await page.goto("/auth/login");
  await fillLoginForm(page, email, DEMO_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(/\/profile/, { timeout: 30_000 });
}

export async function expectPath(page: Page, pathPattern: RegExp) {
  await expect(page).toHaveURL(pathPattern);
}
