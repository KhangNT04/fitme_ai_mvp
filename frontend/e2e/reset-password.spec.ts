import { test, expect } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_URL || "http://localhost:8080/api/v1";
const DEMO_EMAIL = "user@fitme.ai";
const NEW_PASSWORD = "fitme-reset-e2e";

test.describe("Reset password flow", () => {
  test.skip(!process.env.FITME_TEST_EXPOSE_RESET_TOKENS, "Requires FITME_TEST_EXPOSE_RESET_TOKENS=true on backend");

  test("forgot password → reset → login with new password", async ({ page, request }) => {
    await request.post(`${API_BASE}/auth/forgot-password`, {
      data: { email: DEMO_EMAIL },
    });

    const tokenRes = await request.get(`${API_BASE}/test/password-reset-token?email=${encodeURIComponent(DEMO_EMAIL)}`);
    expect(tokenRes.ok()).toBeTruthy();
    const tokenBody = await tokenRes.json();
    const token = tokenBody.data.token as string;
    expect(token).toBeTruthy();

    await page.goto(`/auth/reset-password?token=${token}`);
    await page.getByLabel("Mật khẩu mới").fill(NEW_PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Cập nhật mật khẩu" }).click();

    await expect(page.getByText(/Mật khẩu đã được cập nhật/)).toBeVisible({ timeout: 10_000 });

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Mật khẩu").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/(profile|discover|$)/, { timeout: 15_000 });

    await request.post(`${API_BASE}/auth/reset-password`, {
      data: { token: (await (await request.get(`${API_BASE}/test/password-reset-token?email=${encodeURIComponent(DEMO_EMAIL)}`)).json()).data.token, newPassword: "fitme123" },
    });
  });
});
