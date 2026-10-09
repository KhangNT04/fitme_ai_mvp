import { test, expect } from "@playwright/test";
import { demoPassword } from "./helpers/auth";
import { registerUser, uniqueEmail } from "./helpers/roles";

const API_BASE = process.env.PLAYWRIGHT_API_URL || "http://localhost:8080/api/v1";
const NEW_PASSWORD = "fitme-reset-e2e";

test.describe("Reset password flow", () => {
  test.skip(!process.env.FITME_TEST_EXPOSE_RESET_TOKENS, "Requires FITME_TEST_EXPOSE_RESET_TOKENS=true on backend");
  test.setTimeout(120_000);

  // Uses a fresh account so a failure never leaves the shared seed user with a changed password.
  test("forgot password → reset → login with new password", async ({ page, browser, request }) => {
    const email = uniqueEmail("reset");
    await registerUser(page, email);

    const forgot = await request.post(`${API_BASE}/auth/forgot-password`, { data: { email } });
    expect(forgot.ok()).toBeTruthy();
    const tokenRes = await request.get(`${API_BASE}/test/password-reset-token?email=${encodeURIComponent(email)}`);
    expect(tokenRes.ok()).toBeTruthy();
    const token = ((await tokenRes.json()) as { data: { token: string } }).data.token;
    expect(token).toBeTruthy();

    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    await guest.goto(`/auth/reset-password?token=${encodeURIComponent(token)}`);
    await guest.getByLabel("Mật khẩu mới").fill(NEW_PASSWORD);
    await guest.getByLabel("Xác nhận mật khẩu").fill(NEW_PASSWORD);
    await guest.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
    await expect(guest.getByText(/Mật khẩu đã được cập nhật/)).toBeVisible({ timeout: 10_000 });

    const reuse = await request.post(`${API_BASE}/auth/reset-password`, {
      data: { token, newPassword: "another-pass-123" },
    });
    expect(reuse.status(), "a reset token must not work twice").toBe(400);

    const oldLogin = await request.post(`${API_BASE}/auth/login`, { data: { email, password: demoPassword() } });
    expect(oldLogin.ok(), "old password must stop working").toBeFalsy();

    await guest.goto("/auth/login");
    await guest.locator('input[type="email"]').first().fill(email);
    await guest.locator('input[type="password"]').first().fill(NEW_PASSWORD);
    await guest.getByRole("button", { name: "Đăng nhập" }).click();
    await guest.waitForURL(/\/profile/, { timeout: 30_000 });
    await expect(guest.getByText(email, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await guestContext.close();
  });
});
