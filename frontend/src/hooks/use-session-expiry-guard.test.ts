import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const replaceMock = vi.fn();
let currentPathname = "/admin/users";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
}));

const revokeRefreshTokenMock = vi.fn();

vi.mock("@/services/auth-api", () => ({
  authApi: {
    revokeRefreshToken: (...args: unknown[]) => revokeRefreshTokenMock(...args),
  },
}));

import { useSessionExpiryGuard } from "./use-session-expiry-guard";
import { useAuthStore } from "@/stores/auth-store";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/lib/auth-events";
import { AUTH_REFRESH_KEY } from "@/utils/constants";

function mockJwt(expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  return `${header}.${payload}.signature`;
}

describe("useSessionExpiryGuard", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    revokeRefreshTokenMock.mockReset();
    revokeRefreshTokenMock.mockResolvedValue(undefined);
    currentPathname = "/admin/users";
    localStorage.clear();
    useAuthStore.setState({
      user: { id: "u1", email: "admin@fitme.ai", fullName: "Admin", role: "ADMIN", emailVerified: true },
      accessToken: mockJwt(3600),
      refreshToken: mockJwt(7200),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("signs the viewer out and returns to the admin sign-in page when the session expires", async () => {
    renderHook(() => useSessionExpiryGuard());

    await act(async () => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    });

    expect(replaceMock).toHaveBeenCalledWith("/admin/login?redirect=%2Fadmin%2Fusers&expired=1");
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("revokes the dead refresh token before dropping it", async () => {
    localStorage.setItem(AUTH_REFRESH_KEY, "dead-refresh-token");

    renderHook(() => useSessionExpiryGuard());

    await act(async () => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    });

    expect(revokeRefreshTokenMock).toHaveBeenCalledWith("dead-refresh-token");
  });

  it("sends brand viewers to the brand sign-in page", async () => {
    currentPathname = "/brand/dashboard";

    renderHook(() => useSessionExpiryGuard());

    await act(async () => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    });

    expect(replaceMock).toHaveBeenCalledWith("/brand/login?redirect=%2Fbrand%2Fdashboard&expired=1");
  });

  it("sends consumer viewers to the consumer sign-in page", async () => {
    currentPathname = "/profile";

    renderHook(() => useSessionExpiryGuard());

    await act(async () => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    });

    expect(replaceMock).toHaveBeenCalledWith("/auth/login?redirect=%2Fprofile&expired=1");
  });

  it("signs out once even when the expiry is reported repeatedly", async () => {
    renderHook(() => useSessionExpiryGuard());

    await act(async () => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it("signs out when the stored refresh token quietly expires while the tab idles", async () => {
    vi.useFakeTimers();
    localStorage.setItem(AUTH_REFRESH_KEY, mockJwt(-60));

    renderHook(() => useSessionExpiryGuard());

    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });

    expect(replaceMock).toHaveBeenCalledWith("/admin/login?redirect=%2Fadmin%2Fusers&expired=1");
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("keeps the session when the refresh token is still valid", async () => {
    vi.useFakeTimers();
    localStorage.setItem(AUTH_REFRESH_KEY, mockJwt(7200));

    renderHook(() => useSessionExpiryGuard());

    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).not.toBeNull();
  });
});
