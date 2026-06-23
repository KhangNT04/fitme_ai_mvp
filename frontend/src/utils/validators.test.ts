import { describe, expect, it } from "vitest";
import { bodyProfileSchema, occasionSchema } from "./validators";

const validBodyProfile = {
  heightCm: 170,
  weightKg: 65,
  fitPreference: "REGULAR" as const,
  skinTone: "MEDIUM" as const,
  goals: ["Tự tin hơn"],
};

describe("bodyProfileSchema", () => {
  it("accepts weight within 25-250 kg", () => {
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 25 }).success).toBe(true);
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 250 }).success).toBe(true);
    expect(bodyProfileSchema.safeParse({ ...validBodyProfile, weightKg: 100 }).success).toBe(true);
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
