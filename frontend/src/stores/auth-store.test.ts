import { describe, expect, it, beforeEach, vi } from "vitest";
import { useAuthStore } from "./auth-store";

function mockJwt(expiresInSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds, type: "access" }),
  );
  return `${header}.${payload}.signature`;
}

vi.mock("@/services/auth-api", () => ({
  authApi: { logout: vi.fn().mockResolvedValue(undefined) },
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ role: "USER" }),
    }),
  );
});

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it("setAuth stores user and tokens", async () => {
    const user = { id: "u1", email: "a@b.com", fullName: "A", role: "USER" as const, emailVerified: true };
    await useAuthStore.getState().setAuth(user, mockJwt(), mockJwt());
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("a@b.com");
    expect(state.accessToken).toContain("signature");
    expect(state.isAuthenticated()).toBe(true);
  });

  it("clearAuth resets state", async () => {
    const user = { id: "u1", email: "a@b.com", fullName: "A", role: "USER" as const, emailVerified: true };
    await useAuthStore.getState().setAuth(user, mockJwt(), mockJwt());
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("isBrand and isAdmin reflect role", async () => {
    await useAuthStore.getState().setAuth(
      { id: "b1", email: "b@b.com", fullName: "B", role: "BRAND", emailVerified: true },
      mockJwt(),
      mockJwt(),
    );
    expect(useAuthStore.getState().isBrand()).toBe(true);
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });
});
