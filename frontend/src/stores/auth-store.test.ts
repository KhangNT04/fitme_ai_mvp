import { describe, expect, it, beforeEach, vi } from "vitest";
import { useAuthStore } from "./auth-store";

vi.mock("@/services/auth-api", () => ({
  authApi: { logout: vi.fn().mockResolvedValue(undefined) },
}));

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it("setAuth stores user and tokens", () => {
    const user = { id: "u1", email: "a@b.com", displayName: "A", role: "USER" as const, emailVerified: true };
    useAuthStore.getState().setAuth(user, "access", "refresh");
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("a@b.com");
    expect(state.accessToken).toBe("access");
    expect(state.isAuthenticated()).toBe(true);
  });

  it("clearAuth resets state", () => {
    const user = { id: "u1", email: "a@b.com", displayName: "A", role: "USER" as const, emailVerified: true };
    useAuthStore.getState().setAuth(user, "access", "refresh");
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("isBrand and isAdmin reflect role", () => {
    useAuthStore.getState().setAuth(
      { id: "b1", email: "b@b.com", displayName: "B", role: "BRAND", emailVerified: true },
      "t",
      "r"
    );
    expect(useAuthStore.getState().isBrand()).toBe(true);
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });
});
