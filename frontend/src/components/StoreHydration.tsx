"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { useTryOnStore } from "@/stores/tryon-store";
import { AUTH_TOKEN_KEY, AUTH_REFRESH_KEY, SESSION_STORAGE_KEY } from "@/utils/constants";

/** Rehydrate persisted Zustand stores after Next.js hydration to avoid SSR mismatches. */
export function StoreHydration() {
  useEffect(() => {
    const syncAuthTokens = useAuthStore.persist.onFinishHydration((state) => {
      if (typeof window === "undefined" || !state?.accessToken) return;
      localStorage.setItem(AUTH_TOKEN_KEY, state.accessToken);
      if (state.refreshToken) {
        localStorage.setItem(AUTH_REFRESH_KEY, state.refreshToken);
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

    return () => {
      syncAuthTokens();
      syncSessionToken();
    };
  }, []);

  return null;
}
