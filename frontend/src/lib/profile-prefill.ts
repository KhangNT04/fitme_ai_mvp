import type { BodyProfile, StyleProfile } from "@/types/user";
import type { TryOnInputForm } from "@/utils/validators";
import { mergeBodyProfiles, mergeStyleProfiles } from "@/lib/profile-merge";

/** Saved profile fills gaps; in-flow draft edits override on overlapping fields. */
export function resolveBodyProfileInitial(
  draft?: BodyProfile | null,
  saved?: BodyProfile | null,
): BodyProfile | null {
  if (!draft && !saved) return null;
  return mergeBodyProfiles(saved, draft);
}

export function resolveStyleProfileInitial(
  draft?: StyleProfile | null,
  saved?: StyleProfile | null,
): StyleProfile | null {
  if (!draft && !saved) return null;
  const merged = mergeStyleProfiles(saved, draft);
  return Object.keys(merged).length > 0 ? merged : null;
}
export function bodyProfileToTryOnDefaults(body: BodyProfile): Partial<TryOnInputForm> {
  const defaults: Partial<TryOnInputForm> = {
    heightCm: body.heightCm,
    weightKg: body.weightKg,
  };
  if (body.fitPreference) defaults.fitPreference = body.fitPreference;
  if (body.skinTone) defaults.skinTone = body.skinTone;
  return defaults;
}

export function tryOnFormToBodyProfile(data: TryOnInputForm): BodyProfile {
  return {
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    fitPreference: data.fitPreference as BodyProfile["fitPreference"],
    skinTone: data.skinTone as BodyProfile["skinTone"],
  };
}

export function hasMinimalBodyProfile(profile?: BodyProfile | null): profile is BodyProfile {
  return profile != null && profile.heightCm > 0 && profile.weightKg > 0;
}

export function hasStyleProfileContent(profile?: StyleProfile | null): boolean {
  if (!profile) return false;
  return !!(
    profile.primaryStyle ||
    profile.riskLevel ||
    profile.preferredColors?.length ||
    profile.secondaryStyles?.length ||
    profile.avoidedColors?.length ||
    profile.artisticMode
  );
}
