import apiClient, { unwrap } from "./api-client";
import type { BodyProfile, StyleProfile } from "@/types/user";

interface BackendBodyProfile {
  heightCm: number;
  weightKg: number;
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
    weightKg: Number(raw.weightKg),
    fitPreference: raw.fitPreference,
    skinTone: raw.skinTone,
    goals,
    measurements: hasMeasurements ? measurements : undefined,
  };
}

export const profileApi = {
  getBodyProfile: async (): Promise<BodyProfile | null> => {
    const res = await apiClient.get("/me/body-profile");
    const data = unwrap(res) as BackendBodyProfile | null;
    return data ? mapBodyProfile(data) : null;
  },
  saveBodyProfile: async (data: BodyProfile): Promise<BodyProfile> => {
    const payload = {
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      fitPreference: data.fitPreference,
      skinTone: data.skinTone,
      goals: { items: data.goals },
      shoulderWidthCm: data.measurements?.shoulderWidthCm,
      chestCm: data.measurements?.chestCm,
      waistCm: data.measurements?.waistCm,
      abdomenCm: data.measurements?.abdomenCm,
      hipCm: data.measurements?.hipCm,
      thighCm: data.measurements?.thighCm,
      inseamCm: data.measurements?.inseamCm,
      armLengthCm: data.measurements?.armLengthCm,
    };
    const res = await apiClient.post("/me/body-profile", payload);
    return mapBodyProfile(unwrap(res) as BackendBodyProfile);
  },
  getStyleProfile: async (): Promise<StyleProfile | null> => {
    const res = await apiClient.get("/me/style-profile");
    return unwrap(res);
  },
  saveStyleProfile: async (data: StyleProfile): Promise<StyleProfile> => {
    const res = await apiClient.post("/me/style-profile", data);
    return unwrap(res);
  },
};

/** @deprecated Import from `@/services/wardrobe-api` instead */
export { wardrobeApi } from "./wardrobe-api";
