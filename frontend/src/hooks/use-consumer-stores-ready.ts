"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { AUTH_TOKEN_KEY, AUTH_REFRESH_KEY, SESSION_STORAGE_KEY } from "@/utils/constants";

function syncAuthTokensToLocalStorage(): void {
  if (typeof window === "undefined") return;
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
  }
}

function syncSessionTokenToLocalStorage(): void {
  if (typeof window === "undefined") return;
  const sessionToken = useSessionStore.getState().session?.sessionToken;
  if (sessionToken) {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
  }
}

function waitForStoreHydration(store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
    rehydrate: () => Promise<void> | void;
  };
}): Promise<void> {
  return new Promise((resolve) => {
    if (store.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = store.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
    void store.persist.rehydrate();
  });
}

/** Wait until persisted auth/session stores are ready and tokens are synced for API calls. */
export function useConsumerStoresReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.all([
        waitForStoreHydration(useAuthStore),
        waitForStoreHydration(useSessionStore),
        waitForStoreHydration(useConsultationStore),
      ]);
      syncAuthTokensToLocalStorage();
      syncSessionTokenToLocalStorage();
      if (!cancelled) {
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

export function hasApiRequestIdentity(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(AUTH_TOKEN_KEY) || !!localStorage.getItem(SESSION_STORAGE_KEY);
}
