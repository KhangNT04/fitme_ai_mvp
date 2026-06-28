"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { sessionApi } from "@/services/session-api";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";

export function useEnsureSession() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const setSessionId = useConsultationStore((s) => s.setSessionId);

  const ensureSession = useCallback(async () => {
    if (session?.sessionToken) {
      setSessionId(session.sessionId);
      return session;
    }
    try {
      const newSession = await sessionApi.createAnonymous();
      setSession(newSession);
      setSessionId(newSession.sessionId);
      return newSession;
    } catch {
      router.push("/");
      return null;
    }
  }, [session, setSession, setSessionId, router]);

  return { ensureSession, session };
}
