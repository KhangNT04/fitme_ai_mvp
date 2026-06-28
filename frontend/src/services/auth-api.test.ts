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
});
