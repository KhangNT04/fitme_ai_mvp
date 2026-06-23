"use client";

import { useRouter } from "next/navigation";
import { sessionApi } from "@/services/session-api";
import { useSessionStore } from "@/stores/session-store";
import { useConsultationStore } from "@/stores/consultation-store";

export function useEnsureSession() {
  const router = useRouter();
  const { session, setSession } = useSessionStore();
  const { setSessionId } = useConsultationStore();

  const ensureSession = async () => {
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
  };

  return { ensureSession, session };
}
