import { describe, expect, it } from "vitest";
import {
  bodyProfileToTryOnDefaults,
  hasMinimalBodyProfile,
  resolveBodyProfileInitial,
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
});
