"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { sessionApi } from "@/services/session-api";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { SESSION_STORAGE_KEY } from "@/utils/constants";

function persistSessionToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
  }
}

export function useEnsureSession() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const setSessionId = useConsultationStore((s) => s.setSessionId);

  const ensureSession = useCallback(async () => {
    const createFresh = async () => {
      const newSession = await sessionApi.createAnonymous();
      setSession(newSession);
      setSessionId(newSession.sessionId);
      persistSessionToken(newSession.sessionToken);
      return newSession;
    };

    const existing = useSessionStore.getState().session;
    if (existing?.sessionToken) {
      setSessionId(existing.sessionId);
      persistSessionToken(existing.sessionToken);
      return existing;
    }

    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (storedToken) {
      try {
        const current = await sessionApi.getCurrent();
        setSession(current);
        setSessionId(current.sessionId);
        persistSessionToken(current.sessionToken);
        return current;
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }

    try {
      return await createFresh();
    } catch {
      router.push("/");
      return null;
    }
  }, [setSession, setSessionId, router]);

  return { ensureSession, session };
}
