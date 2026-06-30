import type { BodyMeasurements, BodyProfile, StyleProfile } from "@/types/user";

const MEASUREMENT_KEYS = [
  "shoulderWidthCm",
  "chestCm",
  "waistCm",
  "abdomenCm",
  "hipCm",
  "thighCm",
  "inseamCm",
  "armLengthCm",
] as const;

function mergeMeasurements(
  base?: BodyMeasurements,
  update?: BodyMeasurements,
): BodyMeasurements | undefined {
  if (!base && !update) return undefined;
  if (!update) return base;
  if (!base) return update;

  const merged: BodyMeasurements = { ...base };
  for (const key of MEASUREMENT_KEYS) {
    const value = update[key];
    if (value != null && !Number.isNaN(value)) {
      merged[key] = value;
    }
  }

  const hasAny = Object.values(merged).some((v) => v != null && !Number.isNaN(v as number));
  return hasAny ? merged : undefined;
}

/** Combine saved profile with in-flow edits; defined update fields win. */
export function mergeBodyProfiles(
  base: BodyProfile | null | undefined,
  update: BodyProfile | null | undefined,
): BodyProfile | null {
  if (!update && !base) return null;
  if (!update) return base ?? null;
  if (!base) return update;

  return {
    heightCm: update.heightCm,
    weightKg: update.weightKg,
    gender: update.gender ?? base.gender,
    fitPreference: "fitPreference" in update ? update.fitPreference : base?.fitPreference,
    skinTone: "skinTone" in update ? update.skinTone : base?.skinTone,
    goals: "goals" in update ? update.goals : base?.goals,
    measurements: mergeMeasurements(base.measurements, update.measurements),
  };
}

export function mergeStyleProfiles(
  base: StyleProfile | null | undefined,
  update: StyleProfile | null | undefined,
): StyleProfile {
  if (!update && !base) return {};
  if (!update) return base ?? {};
  if (!base) return update;

  return {
    primaryStyle: update.primaryStyle ?? base.primaryStyle,
    secondaryStyles: update.secondaryStyles ?? base.secondaryStyles,
    riskLevel: update.riskLevel ?? base.riskLevel,
    artisticMode: update.artisticMode ?? base.artisticMode,
    preferredColors: update.preferredColors ?? base.preferredColors,
    avoidedColors: update.avoidedColors ?? base.avoidedColors,
  };
}

export function bodyProfileToPayload(data: BodyProfile): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    gender: data.gender,
    fitPreference: data.fitPreference ?? "REGULAR",
  };
  if (data.skinTone != null) payload.skinTone = data.skinTone;
  if (data.goals != null) payload.goals = { items: data.goals };

  const m = data.measurements;
  if (m?.shoulderWidthCm != null) payload.shoulderWidthCm = m.shoulderWidthCm;
  if (m?.chestCm != null) payload.chestCm = m.chestCm;
  if (m?.waistCm != null) payload.waistCm = m.waistCm;
  if (m?.abdomenCm != null) payload.abdomenCm = m.abdomenCm;
  if (m?.hipCm != null) payload.hipCm = m.hipCm;
  if (m?.thighCm != null) payload.thighCm = m.thighCm;
  if (m?.inseamCm != null) payload.inseamCm = m.inseamCm;
  if (m?.armLengthCm != null) payload.armLengthCm = m.armLengthCm;

  return payload;
}

export function styleProfileToPayload(data: StyleProfile): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.primaryStyle != null && data.primaryStyle !== "") {
    payload.primaryStyle = data.primaryStyle;
  }
  if (data.secondaryStyles != null) payload.secondaryStyles = data.secondaryStyles;
  if (data.riskLevel != null) payload.riskLevel = data.riskLevel;
  if (data.artisticMode != null) payload.artisticMode = data.artisticMode;
  if (data.preferredColors != null) payload.preferredColors = data.preferredColors;
  if (data.avoidedColors != null) payload.avoidedColors = data.avoidedColors;
  return payload;
}
