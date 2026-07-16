import apiClient, { unwrap, type ApiError } from "./api-client";
import type { BodyProfile, StyleProfile } from "@/types/user";
import { normalizeKgWeight } from "@/lib/form-number";
import {
  bodyProfileToPayload,
  mergeBodyProfiles,
  mergeStyleProfiles,
  styleProfileToPayload,
} from "@/lib/profile-merge";

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
};

/** @deprecated Import from `@/services/wardrobe-api` instead */
export { wardrobeApi } from "./wardrobe-api";
