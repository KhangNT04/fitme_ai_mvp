"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSavedProfiles } from "@/hooks/use-saved-profiles";
import {
  getGuestBodyProfile,
  isBodyProfileReady,
} from "@/lib/local-profile-storage";
import type { BodyProfile } from "@/types/user";

/**
 * Resolves whether the user has a usable body profile for stylist chat.
 * Authenticated: DB profile. Guest: localStorage (30-day TTL).
 */
export function useBodyProfileReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const {
    bodyProfile: dbProfile,
    isLoading: dbLoading,
    isBodyFetching,
    refetch,
  } = useSavedProfiles({
    enabled: isAuthenticated,
  });
  const [guestProfile, setGuestProfile] = useState<BodyProfile | null>(null);
  const [guestChecked, setGuestChecked] = useState(false);

  const refreshGuest = useCallback(() => {
    setGuestProfile(getGuestBodyProfile());
    setGuestChecked(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    const timer = window.setTimeout(refreshGuest, 0);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, refreshGuest]);

  const profile: BodyProfile | null = isAuthenticated ? dbProfile : guestProfile;
  const ready = isBodyProfileReady(profile);
  // A cached incomplete profile may be stale right after saving; wait for the refetch.
  const isLoading = isAuthenticated
    ? dbLoading || (!ready && isBodyFetching)
    : !guestChecked;

  return {
    ready,
    profile,
    isLoading,
    isAuthenticated,
    refetch: async () => {
      if (isAuthenticated) {
        await refetch();
      } else {
        refreshGuest();
      }
    },
    refreshGuest,
  };
}
