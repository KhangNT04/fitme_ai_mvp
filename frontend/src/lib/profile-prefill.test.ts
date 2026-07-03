import { describe, expect, it } from "vitest";
import {
  bodyProfileToTryOnDefaults,
  hasMinimalBodyProfile,
  resolveBodyProfileInitial,
  resolveTryOnFormInitial,
  resolveTryOnFormValues,
  resolveStyleProfileInitial,
} from "./profile-prefill";

describe("profile-prefill", () => {
  const savedBody = { heightCm: 170, weightKg: 60, gender: "FEMALE" as const, fitPreference: "REGULAR" as const };
  const draftBody = { heightCm: 165, weightKg: 55, gender: "FEMALE" as const };

  it("merges saved optional fields into partial draft", () => {
    expect(resolveBodyProfileInitial(draftBody, savedBody)).toEqual({
      heightCm: 165,
      weightKg: 55,
      gender: "FEMALE",
      fitPreference: "REGULAR",
    });
  });

  it("falls back to saved body profile", () => {
    expect(resolveBodyProfileInitial(null, savedBody)).toEqual(savedBody);
  });

  it("maps saved body profile to try-on defaults", () => {
    expect(bodyProfileToTryOnDefaults(savedBody)).toEqual({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
    });
  });

  it("merges consultation draft into try-on form initial values", () => {
    expect(resolveTryOnFormInitial(draftBody, savedBody)).toEqual({
      heightCm: 165,
      weightKg: 55,
      fitPreference: "REGULAR",
    });
    expect(resolveTryOnFormInitial(null, savedBody)).toEqual({
      heightCm: 170,
      weightKg: 60,
      fitPreference: "REGULAR",
    });
  });

  it("checks minimal body profile", () => {
    expect(hasMinimalBodyProfile({ heightCm: 170, weightKg: 60, gender: "FEMALE" })).toBe(true);
    expect(hasMinimalBodyProfile(null)).toBe(false);
    expect(hasMinimalBodyProfile({ heightCm: 0, weightKg: 60, gender: "FEMALE" })).toBe(false);
  });

  it("merges saved style fields into partial draft", () => {
    const draft = { primaryStyle: "Minimal" };
    const saved = {
      primaryStyle: "Office Chic",
      riskLevel: "BALANCED" as const,
      preferredColors: ["Xám"],
    };
    expect(resolveStyleProfileInitial(draft, saved)).toEqual({
      primaryStyle: "Minimal",
      riskLevel: "BALANCED",
      preferredColors: ["Xám"],
    });
  });

  it("prefers saved profile over stale try-on store body fields", () => {
    const profile = { heightCm: 170, weightKg: 60, fitPreference: "RELAXED" as const, skinTone: "MEDIUM" as const };
    expect(
      resolveTryOnFormValues(bodyProfileToTryOnDefaults({ ...profile, gender: "MALE" }), {
        heightCm: 170,
        weightKg: 58,
        fitPreference: "REGULAR",
        skinTone: "MEDIUM",
      }),
    ).toEqual({
      inputMode: "OUTFIT_BOARD_ONLY",
      heightCm: 170,
      weightKg: 60,
      fitPreference: "RELAXED",
      skinTone: "MEDIUM",
    });
  });

  it("keeps flow-only fields from try-on store", () => {
    expect(
      resolveTryOnFormValues(
        { heightCm: 170, weightKg: 60, fitPreference: "RELAXED" },
        { inputMode: "AVATAR", occasion: "Đi cafe", usualSize: "M" },
      ),
    ).toEqual({
      inputMode: "AVATAR",
      heightCm: 170,
      weightKg: 60,
      fitPreference: "RELAXED",
      skinTone: "MEDIUM",
      occasion: "Đi cafe",
      usualSize: "M",
    });
  });
});
