"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/services/profile-api";
import { linkAnonymousSession } from "@/services/auth-api";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Loads body/style profiles for the current user or anonymous session.
 * Shares React Query cache with the profile hub pages.
 */
export function useSavedProfiles(options?: { enabled?: boolean }) {
  const { ensureSession } = useEnsureSession();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [sessionReady, setSessionReady] = useState(false);
  const enabled = (options?.enabled ?? true) && sessionReady;

  useEffect(() => {
    let active = true;
    void (async () => {
      await ensureSession();
      if (isAuthenticated) {
        await linkAnonymousSession();
      }
      if (active) setSessionReady(true);
    })();
    return () => {
      active = false;
    };
  }, [ensureSession, isAuthenticated]);

  const bodyQuery = useQuery({
    queryKey: ["body-profile"],
    queryFn: profileApi.getBodyProfile,
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const styleQuery = useQuery({
    queryKey: ["style-profile"],
    queryFn: profileApi.getStyleProfile,
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });

  return {
    bodyProfile: bodyQuery.data ?? null,
    styleProfile: styleQuery.data ?? null,
    isLoading: !sessionReady || bodyQuery.isLoading || styleQuery.isLoading,
    isError: bodyQuery.isError || styleQuery.isError,
    refetch: async () => {
      await Promise.all([bodyQuery.refetch(), styleQuery.refetch()]);
    },
  };
}
