import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnonymousSession } from "@/types/session";
import { SESSION_STORAGE_KEY } from "@/utils/constants";

interface SessionState {
  session: AnonymousSession | null;
  setSession: (session: AnonymousSession) => void;
  clearSession: () => void;
  getSessionToken: () => string | null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(SESSION_STORAGE_KEY, session.sessionToken);
        }
        set({ session });
      },
      clearSession: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
        set({ session: null });
      },
      getSessionToken: () => get().session?.sessionToken ?? null,
    }),
    { name: "fitme-session", skipHydration: true }
  )
);
