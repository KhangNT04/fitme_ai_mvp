import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";
import { authApi } from "@/services/auth-api";
import { AUTH_TOKEN_KEY, AUTH_REFRESH_KEY } from "@/utils/constants";

function setRoleCookie(role: AuthUser["role"]) {
  if (typeof document !== "undefined") {
    document.cookie = `fitme-role=${role}; path=/; max-age=86400; SameSite=Lax`;
  }
}

function clearRoleCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "fitme-role=; path=/; max-age=0";
  }
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
          fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          }).catch(() => undefined);
        }
        setRoleCookie(user.role);
        set({ user, accessToken, refreshToken });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_REFRESH_KEY);
        }
        clearRoleCookie();
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
