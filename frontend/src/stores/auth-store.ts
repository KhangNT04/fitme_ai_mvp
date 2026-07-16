import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";
import { authApi } from "@/services/auth-api";
import { useConsultationStore } from "@/stores/consultation-store";
import { isJwtExpired } from "@/lib/jwt-expiry";
import { AUTH_CLEAR_EVENT, AUTH_DROP_ACCESS_EVENT } from "@/lib/auth-events";
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
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
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
      setAuth: async (user, accessToken, refreshToken) => {
        const prevUserId = get().user?.id;
        if (prevUserId && prevUserId !== user.id) {
          useConsultationStore.getState().reset();
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
          localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
          await syncPortalSession(accessToken);
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
        useConsultationStore.getState().reset();
        get().clearAuth();
      },
      isAuthenticated: () => {
        const token = get().accessToken;
        return !!token && !isJwtExpired(token);
      },
      isBrand: () => get().user?.role === "BRAND",
      isAdmin: () => get().user?.role === "ADMIN",
    }),
    { name: "fitme-auth", skipHydration: true }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_CLEAR_EVENT, () => {
    useAuthStore.getState().clearAuth();
  });
  window.addEventListener(AUTH_DROP_ACCESS_EVENT, () => {
    const token = useAuthStore.getState().accessToken;
    if (token && isJwtExpired(token)) {
      useAuthStore.setState({ accessToken: null });
    }
  });
}
