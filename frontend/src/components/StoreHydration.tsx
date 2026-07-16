"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { useTryOnStore } from "@/stores/tryon-store";
import { useStylistChatStore } from "@/stores/stylist-chat-store";
import { isJwtExpired } from "@/lib/jwt-expiry";
import { AUTH_TOKEN_KEY, AUTH_REFRESH_KEY, SESSION_STORAGE_KEY } from "@/utils/constants";

/** Rehydrate persisted Zustand stores after Next.js hydration to avoid SSR mismatches. */
export function StoreHydration() {
  useEffect(() => {
    const syncAuthTokens = useAuthStore.persist.onFinishHydration((state) => {
      if (typeof window === "undefined") return;

      const access = state?.accessToken ?? null;
      const refresh = state?.refreshToken ?? null;

      // Stale JWTs from previous deploys/sessions must not block guest flows.
      if (access && isJwtExpired(access) && (!refresh || isJwtExpired(refresh))) {
        useAuthStore.getState().clearAuth();
        return;
      }

      if (access && !isJwtExpired(access)) {
        localStorage.setItem(AUTH_TOKEN_KEY, access);
        if (refresh) {
          localStorage.setItem(AUTH_REFRESH_KEY, refresh);
        }
        return;
      }

      if (access && isJwtExpired(access)) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      if (refresh && !isJwtExpired(refresh)) {
        localStorage.setItem(AUTH_REFRESH_KEY, refresh);
      } else if (refresh && isJwtExpired(refresh)) {
        useAuthStore.getState().clearAuth();
      }
    });

    const syncSessionToken = useSessionStore.persist.onFinishHydration((state) => {
      if (typeof window === "undefined" || !state?.session?.sessionToken) return;
      localStorage.setItem(SESSION_STORAGE_KEY, state.session.sessionToken);
    });

    void useAuthStore.persist.rehydrate();
    void useSessionStore.persist.rehydrate();
    void useConsultationStore.persist.rehydrate();
    void useTryOnStore.persist.rehydrate();
    void useStylistChatStore.persist.rehydrate();

    return () => {
      syncAuthTokens();
      syncSessionToken();
    };
  }, []);

  return null;
}
