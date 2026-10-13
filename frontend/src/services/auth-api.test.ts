import { describe, expect, it, vi, beforeEach } from "vitest";
import apiClient from "./api-client";
import { authApi } from "./auth-api";

vi.mock("./api-client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  unwrap: (res: { data: unknown }) => (res.data as { data?: unknown }).data ?? res.data,
}));

describe("authApi", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("login posts credentials", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          userId: "u1",
          email: "a@b.com",
          displayName: "A",
          role: "USER",
          accessToken: "at",
          refreshToken: "rt",
          emailVerified: true,
        },
      },
    });
    const res = await authApi.login({ email: "a@b.com", password: "pass" });
    expect(res.accessToken).toBe("at");
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "pass" });
  });

  it("a two-factor challenge stores no session until the code is verified", async () => {
    localStorage.clear();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { email: "admin@b.com", role: "ADMIN", emailVerified: true, requiresTwoFactor: true, twoFactorToken: "ch" },
      },
    });
    const challenge = await authApi.login({ email: "admin@b.com", password: "pass" });
    expect(challenge.requiresTwoFactor).toBe(true);
    expect(challenge.twoFactorToken).toBe("ch");
    expect(challenge.accessToken).toBe("");
    expect(localStorage.length).toBe(0);
    expect(apiClient.post).toHaveBeenCalledTimes(1);

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { userId: "a1", email: "admin@b.com", displayName: "A", role: "ADMIN", accessToken: "at2", refreshToken: "rt2", emailVerified: true },
      },
    });
    const session = await authApi.loginTwoFactor("ch", "123456");
    expect(apiClient.post).toHaveBeenLastCalledWith("/auth/login/2fa", { twoFactorToken: "ch", code: "123456" });
    expect(session.user.role).toBe("ADMIN");
    expect(session.accessToken).toBe("at2");
  });
});
