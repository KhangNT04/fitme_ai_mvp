import { profileApi } from "@/services/profile-api";
import type { ApiError } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { getGuestBodyProfile } from "@/lib/local-profile-storage";
import type { BodyProfile } from "@/types/user";

async function saveWithAuthFallback(profile: BodyProfile): Promise<BodyProfile> {
  try {
    return await profileApi.saveBodyProfile(profile);
  } catch (e) {
    const status = (e as ApiError)?.status;
    if (status === 401 || status === 403) {
      useAuthStore.getState().clearAuth();
      return profileApi.saveBodyProfile(profile);
    }
    throw e;
  }
}

/** Persists body profile to the backend for the current user or anonymous session. */
export async function ensureServerBodyProfile(
  profile?: BodyProfile | null,
): Promise<BodyProfile> {
  const source = profile ?? getGuestBodyProfile();
  if (!source) {
    throw { message: "Thiếu hồ sơ cơ thể", status: 400 } satisfies ApiError;
  }
  return saveWithAuthFallback(source);
}
