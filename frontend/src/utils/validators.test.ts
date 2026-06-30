import { describe, expect, it } from "vitest";
import { bodyProfileSchema, occasionSchema } from "./validators";

const validBodyProfile = {
  heightCm: 170,
  weightKg: 65,
};

describe("bodyProfileSchema", () => {
  it("accepts only basic measurements", () => {
    expect(bodyProfileSchema.safeParse({ heightCm: 170, weightKg: 65 }).success).toBe(true);
  });

  it("accepts weight within 25-250 kg", () => {
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 25 }).success).toBe(true);
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 250 }).success).toBe(true);
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 100 }).success).toBe(true);
  });

  it("accepts optional fields when provided", () => {
    expect(
      bodyProfileSchema.safeParse({
        ...validBodyProfile,
        fitPreference: "REGULAR" as const,
        skinTone: "MEDIUM" as const,
        goals: ["Thoải mái hơn"],
      }).success,
    ).toBe(true);
  });

  it("accepts partial detailed measurements with omitted optional fields", () => {
    expect(
      bodyProfileSchema.safeParse({
        ...validBodyProfile,
        chestCm: 90,
        hipCm: undefined,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid detailed measurement when provided", () => {
    const result = bodyProfileSchema.safeParse({
      ...validBodyProfile,
      chestCm: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight below 25 kg", () => {
    const result = bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 24 });
    expect(result.success).toBe(false);
  });

  it("rejects weight above 250 kg", () => {
    const result = bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 251 });
    expect(result.success).toBe(false);
  });
});

describe("occasionSchema wardrobeMode", () => {
  const baseOccasion = {
    occasion: "Đi cafe",
    desiredVibe: "Gọn gàng",
  };

  it("accepts submission without occasion or vibe", () => {
    const result = occasionSchema.safeParse({ wardrobeMode: "MIX_WARDROBE_AND_BRAND" });
    expect(result.success).toBe(true);
  });

  const backendWardrobeModes = [
    "NEW_ITEMS_ONLY",
    "MIX_WARDROBE_AND_BRAND",
    "USE_WARDROBE_FIRST",
    "NO_WARDROBE_DATA",
  ] as const;

  it.each(backendWardrobeModes)("accepts wardrobeMode %s", (wardrobeMode) => {
    const result = occasionSchema.safeParse({ ...baseOccasion, wardrobeMode });
    expect(result.success).toBe(true);
  });

  it("rejects invalid wardrobeMode values", () => {
    const result = occasionSchema.safeParse({
      ...baseOccasion,
      wardrobeMode: "INVALID_MODE",
    });
    expect(result.success).toBe(false);
  });
});
