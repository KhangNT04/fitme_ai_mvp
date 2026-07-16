import type { BodyProfile } from "@/types/user";
import { clearTtlStorage, readTtlStorage, writeTtlStorage } from "@/lib/ttl-storage";

export const GUEST_BODY_PROFILE_KEY = "fitme-body-profile-guest";

/** Minimum fields required to start stylist chat. */
export function isBodyProfileReady(profile: BodyProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    Number.isFinite(profile.heightCm) &&
    profile.heightCm > 0 &&
    Number.isFinite(profile.weightKg) &&
    profile.weightKg > 0 &&
    profile.age != null &&
    Number.isFinite(profile.age) &&
    profile.age > 0 &&
    !!profile.gender &&
    !!profile.fitPreference
  );
}

export function getGuestBodyProfile(): BodyProfile | null {
  return readTtlStorage<BodyProfile>(GUEST_BODY_PROFILE_KEY);
}

export function saveGuestBodyProfile(profile: BodyProfile): void {
  writeTtlStorage(GUEST_BODY_PROFILE_KEY, profile);
}

export function clearGuestBodyProfile(): void {
  clearTtlStorage(GUEST_BODY_PROFILE_KEY);
}
