"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { useTryOnStore } from "@/stores/tryon-store";

/** Rehydrate persisted Zustand stores after Next.js hydration to avoid SSR mismatches. */
export function StoreHydration() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    void useSessionStore.persist.rehydrate();
    void useConsultationStore.persist.rehydrate();
    void useTryOnStore.persist.rehydrate();
  }, []);

  return null;
}
