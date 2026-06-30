"use client";

import { useEffect } from "react";
import { useConsultationStore } from "@/stores/consultation-store";
import { useSavedProfiles } from "@/hooks/use-saved-profiles";
import { profileSnapshotKey } from "@/lib/form-number";
import { mergeBodyProfiles, mergeStyleProfiles } from "@/lib/profile-merge";
import type { StyleProfile } from "@/types/user";
/** Sync saved profiles into the consultation draft, filling gaps in partial drafts. */
export function useHydrateConsultationProfiles() {
  const draftBodyProfile = useConsultationStore((s) => s.draft.bodyProfile);
  const draftStyleProfile = useConsultationStore((s) => s.draft.styleProfile);
  const setBodyProfile = useConsultationStore((s) => s.setBodyProfile);
  const setStyleProfile = useConsultationStore((s) => s.setStyleProfile);
  const { bodyProfile, styleProfile, isLoading } = useSavedProfiles();

  useEffect(() => {
    if (isLoading) return;

    if (bodyProfile) {
      const merged = mergeBodyProfiles(bodyProfile, draftBodyProfile);
      if (merged && profileSnapshotKey(merged) !== profileSnapshotKey(draftBodyProfile)) {
        setBodyProfile(merged);
      }
    }

    if (styleProfile) {
      const merged = mergeStyleProfiles(styleProfile, draftStyleProfile);
      if (profileSnapshotKey(merged) !== profileSnapshotKey(draftStyleProfile ?? {})) {
        setStyleProfile(merged);
      }
    }
  }, [
    isLoading,
    draftBodyProfile,
    draftStyleProfile,
    bodyProfile,
    styleProfile,
    setBodyProfile,
    setStyleProfile,
  ]);

  return { bodyProfile, styleProfile, isLoading };
}

export function resolveConsultationStyleProfile(
  draft?: StyleProfile | null,
  saved?: StyleProfile | null,
): StyleProfile {
  return mergeStyleProfiles(saved, draft);
}