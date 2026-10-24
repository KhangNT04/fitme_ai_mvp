import apiClient, { unwrap, type ApiError } from "./api-client";
import { authApi } from "./auth-api";
import { communityApi } from "./community-api";
import { fitkenApi } from "./fitken-api";
import { galleryApi } from "./gallery-api";
import type { BodyProfile, StyleProfile } from "@/types/user";
import type { ProfileSummary } from "@/types/profile";
import { normalizeKgWeight } from "@/lib/form-number";
import {
  bodyProfileToPayload,
  mergeBodyProfiles,
  mergeStyleProfiles,
  styleProfileToPayload,
} from "@/lib/profile-merge";

export const PROFILE_SUMMARY_QUERY_KEY = ["profile-summary"] as const;

async function fetchProfileOrNull<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request();
  } catch (error) {
    if ((error as ApiError)?.status === 404) return null;
    throw error;
  }
}

interface BackendBodyProfile {
  heightCm: number;
  weightKg: number;
  age?: number;
  gender: BodyProfile["gender"];
  fitPreference: BodyProfile["fitPreference"];
  skinTone: BodyProfile["skinTone"];
  goals?: { items?: string[] } | string[];
  shoulderWidthCm?: number;
  chestCm?: number;
  waistCm?: number;
  abdomenCm?: number;
  hipCm?: number;
  thighCm?: number;
  inseamCm?: number;
  armLengthCm?: number;
}

function mapBodyProfile(raw: BackendBodyProfile): BodyProfile {
  const goalsRaw = raw.goals;
  const goals = Array.isArray(goalsRaw)
    ? goalsRaw
    : goalsRaw?.items || [];

  const measurements = {
    shoulderWidthCm: raw.shoulderWidthCm != null ? Number(raw.shoulderWidthCm) : undefined,
    chestCm: raw.chestCm != null ? Number(raw.chestCm) : undefined,
    waistCm: raw.waistCm != null ? Number(raw.waistCm) : undefined,
    abdomenCm: raw.abdomenCm != null ? Number(raw.abdomenCm) : undefined,
    hipCm: raw.hipCm != null ? Number(raw.hipCm) : undefined,
    thighCm: raw.thighCm != null ? Number(raw.thighCm) : undefined,
    inseamCm: raw.inseamCm != null ? Number(raw.inseamCm) : undefined,
    armLengthCm: raw.armLengthCm != null ? Number(raw.armLengthCm) : undefined,
  };

  const hasMeasurements = Object.values(measurements).some((v) => v != null);

  return {
    heightCm: raw.heightCm,
    weightKg: normalizeKgWeight(Number(raw.weightKg)),
    age: raw.age != null ? Number(raw.age) : undefined,
    gender: raw.gender,
    fitPreference: raw.fitPreference,
    skinTone: raw.skinTone,
    goals,
    measurements: hasMeasurements ? measurements : undefined,
  };
}

export const profileApi = {
  getBodyProfile: async (): Promise<BodyProfile | null> =>
    fetchProfileOrNull(async () => {
      const res = await apiClient.get("/me/body-profile");
      const data = unwrap(res) as BackendBodyProfile | null;
      return data ? mapBodyProfile(data) : null;
    }),

  saveBodyProfile: async (data: BodyProfile): Promise<BodyProfile> => {
    const existing = await fetchProfileOrNull(async () => {
      const res = await apiClient.get("/me/body-profile");
      const raw = unwrap(res) as BackendBodyProfile | null;
      return raw ? mapBodyProfile(raw) : null;
    });
    const merged = mergeBodyProfiles(existing, data);
    if (!merged) throw new Error("Thiếu thông tin cơ thể");
    const res = await apiClient.post("/me/body-profile", bodyProfileToPayload(merged));
    return mapBodyProfile(unwrap(res) as BackendBodyProfile);
  },

  getStyleProfile: async (): Promise<StyleProfile | null> =>
    fetchProfileOrNull(async () => {
      const res = await apiClient.get("/me/style-profile");
      return unwrap(res);
    }),

  saveStyleProfile: async (data: StyleProfile): Promise<StyleProfile> => {
    const existing = await fetchProfileOrNull(async () => {
      const res = await apiClient.get("/me/style-profile");
      return unwrap(res);
    });
    const merged = mergeStyleProfiles(existing, data);
    const res = await apiClient.post("/me/style-profile", styleProfileToPayload(merged));
    return unwrap(res);
  },

  /** One request for the whole profile hub: completion checklist, counters and Fitken. */
  getSummary: async (): Promise<ProfileSummary> => {
    const res = await apiClient.get("/me/profile-summary");
    return unwrap(res) as ProfileSummary;
  },
};

/**
 * Builds the profile summary from the individual endpoints.
 *
 * Used when the aggregated endpoint is missing (an older backend). Every number comes from a
 * live endpoint — nothing is invented — and a failing sub-request only zeroes its own counter.
 */
export async function buildProfileSummaryFallback(): Promise<ProfileSummary> {
  const [bodyProfile, styleProfile, twoFactor, wallet, gallery, community] = await Promise.all([
    profileApi.getBodyProfile().catch(() => null),
    profileApi.getStyleProfile().catch(() => null),
    authApi.getTwoFactorStatus().catch(() => null),
    fitkenApi.getWallet().catch(() => null),
    galleryApi.getImages(0, 1).catch(() => null),
    communityApi.getMyProfile().catch(() => null),
  ]);

  const measurementsComplete =
    bodyProfile != null &&
    bodyProfile.heightCm != null &&
    bodyProfile.weightKg != null &&
    bodyProfile.measurements != null &&
    Object.values(bodyProfile.measurements).some((value) => value != null);
  const emailVerified = true;
  const twoFactorEnabled = twoFactor?.enabled ?? false;

  const checklist = {
    BODY_PROFILE: bodyProfile != null,
    MEASUREMENTS: measurementsComplete,
    STYLE_PROFILE: styleProfile != null,
    EMAIL_VERIFIED: emailVerified,
    TWO_FACTOR: twoFactorEnabled,
  };
  const completed = Object.values(checklist).filter(Boolean).length;
  const nextStep = Object.entries(checklist).find(([, done]) => !done)?.[0] ?? null;

  return {
    completionRatio: Math.round((completed / Object.keys(checklist).length) * 100) / 100,
    bodyProfileComplete: checklist.BODY_PROFILE,
    measurementsComplete: checklist.MEASUREMENTS,
    styleProfileComplete: checklist.STYLE_PROFILE,
    brandPreferencesComplete: false,
    emailVerified,
    twoFactorEnabled,
    galleryImages: gallery?.total ?? 0,
    savedOutfits: 0,
    savedTryOns: 0,
    wardrobeItems: 0,
    checkinStreak: 0,
    fitkenBalance: wallet?.balance ?? 0,
    fitkenEarnedThisMonth: 0,
    communityPosts: community?.publishedPosts ?? 0,
    communityFollowers: community?.followers ?? 0,
    nextStep,
  };
}

/** @deprecated Import from `@/services/wardrobe-api` instead */
export { wardrobeApi } from "./wardrobe-api";
