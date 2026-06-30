import { describe, expect, it } from "vitest";
import { mergeBodyProfiles, mergeStyleProfiles, bodyProfileToPayload } from "./profile-merge";

describe("mergeBodyProfiles", () => {
  const saved = {
    heightCm: 170,
    weightKg: 60,
    gender: "FEMALE" as const,
    fitPreference: "REGULAR" as const,
    skinTone: "MEDIUM" as const,
    goals: ["Thoải mái hơn"],
    measurements: { chestCm: 90, waistCm: 70 },
  };

  it("keeps saved optional fields when update omits them", () => {
    const update = { heightCm: 172, weightKg: 61, gender: "FEMALE" as const };
    expect(mergeBodyProfiles(saved, update)).toEqual({
      heightCm: 172,
      weightKg: 61,
      gender: "FEMALE",
      fitPreference: "REGULAR",
      skinTone: "MEDIUM",
      goals: ["Thoải mái hơn"],
      measurements: { chestCm: 90, waistCm: 70 },
    });
  });

  it("applies in-flow optional edits over saved values", () => {
    const update = {
      heightCm: 172,
      weightKg: 61,
      gender: "FEMALE" as const,
      fitPreference: "SLIM" as const,
      measurements: { hipCm: 95 },
    };
    expect(mergeBodyProfiles(saved, update)).toMatchObject({
      fitPreference: "SLIM",
      measurements: { chestCm: 90, waistCm: 70, hipCm: 95 },
    });
  });

  it("overrides a saved measurement when update sends a new value", () => {
    const saved = {
      heightCm: 170,
      weightKg: 60,
      gender: "FEMALE" as const,
      measurements: { chestCm: 88 },
    };
    const update = {
      heightCm: 170,
      weightKg: 60,
      gender: "FEMALE" as const,
      measurements: { chestCm: 90 },
    };
    expect(mergeBodyProfiles(saved, update)?.measurements?.chestCm).toBe(90);
  });
});

describe("mergeStyleProfiles", () => {
  const saved = {
    primaryStyle: "Office Chic",
    riskLevel: "BALANCED" as const,
    artisticMode: true,
    preferredColors: ["Xám"],
  };

  it("keeps saved style options when update only changes primary style", () => {
    expect(mergeStyleProfiles(saved, { primaryStyle: "Minimal" })).toEqual({
      primaryStyle: "Minimal",
      riskLevel: "BALANCED",
      artisticMode: true,
      preferredColors: ["Xám"],
    });
  });

  it("persists explicit artisticMode false from form", () => {
    expect(mergeStyleProfiles(saved, { artisticMode: false }).artisticMode).toBe(false);
  });
});
