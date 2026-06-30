import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";
import { authApi } from "@/services/auth-api";
import { AUTH_TOKEN_KEY, AUTH_REFRESH_KEY } from "@/utils/constants";

async function syncPortalSession(accessToken: string): Promise<void> {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
}

async function clearPortalSession(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isBrand: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
          localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
          syncPortalSession(accessToken).catch(() => undefined);
        }
        set({ user, accessToken, refreshToken });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_REFRESH_KEY);
          clearPortalSession().catch(() => undefined);
        }
        set({ user: null, accessToken: null, refreshToken: null });
      },
      logout: async () => {
        await authApi.logout();
        get().clearAuth();
      },
      isAuthenticated: () => !!get().accessToken,
      isBrand: () => get().user?.role === "BRAND",
      isAdmin: () => get().user?.role === "ADMIN",
    }),
    { name: "fitme-auth", skipHydration: true }
  )
);
