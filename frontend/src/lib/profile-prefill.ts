import type { BodyProfile, StyleProfile } from "@/types/user";
import type { TryOnInput } from "@/types/tryon";
import type { TryOnInputForm } from "@/utils/validators";
import { normalizeKgWeight } from "@/lib/form-number";
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
    weightKg: normalizeKgWeight(body.weightKg),
  };
  if (body.fitPreference) defaults.fitPreference = body.fitPreference;
  if (body.skinTone) defaults.skinTone = body.skinTone;
  return defaults;
}

/** Same merge as profile hub: saved API profile + consultation draft. */
export function resolveTryOnFormInitial(
  draft?: BodyProfile | null,
  saved?: BodyProfile | null,
): Partial<TryOnInputForm> {
  const profile = resolveBodyProfileInitial(draft, saved);
  return profile ? bodyProfileToTryOnDefaults(profile) : {};
}

/** Flow-only fields persisted in try-on store; body metrics always come from profile. */
export function resolveTryOnFormValues(
  profileDefaults: Partial<TryOnInputForm>,
  persistedInput: Partial<TryOnInput> = {},
): TryOnInputForm {
  return {
    inputMode: persistedInput.inputMode ?? "OUTFIT_BOARD_ONLY",
    fitPreference: profileDefaults.fitPreference ?? "REGULAR",
    skinTone: profileDefaults.skinTone ?? "MEDIUM",
    heightCm: profileDefaults.heightCm ?? 0,
    weightKg: profileDefaults.weightKg ?? 0,
    ...(profileDefaults.occasion ? { occasion: profileDefaults.occasion } : {}),
    ...(profileDefaults.desiredVibe ? { desiredVibe: profileDefaults.desiredVibe } : {}),
    ...(profileDefaults.usualSize ? { usualSize: profileDefaults.usualSize } : {}),
    ...(persistedInput.occasion ? { occasion: persistedInput.occasion } : {}),
    ...(persistedInput.desiredVibe ? { desiredVibe: persistedInput.desiredVibe } : {}),
    ...(persistedInput.usualSize ? { usualSize: persistedInput.usualSize } : {}),
  };
}

export function tryOnFormToBodyProfile(data: TryOnInputForm): BodyProfile {
  return {
    heightCm: data.heightCm,
    weightKg: normalizeKgWeight(data.weightKg),
    gender: "OTHER",
    fitPreference: data.fitPreference as BodyProfile["fitPreference"],
    skinTone: data.skinTone as BodyProfile["skinTone"],
  };
}

export function hasMinimalBodyProfile(profile?: BodyProfile | null): profile is BodyProfile {
  return profile != null && profile.heightCm > 0 && profile.weightKg > 0 && !!profile.gender;
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
