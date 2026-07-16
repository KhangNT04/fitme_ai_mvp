import { describe, expect, it } from "vitest";
import { normalizeKgWeight, optionalNumberFormValue, requiredKgWeightFormValue } from "./form-number";
import { bodyProfileToTryOnDefaults } from "./profile-prefill";
import { formToBodyProfile } from "@/components/profile/BodyProfileEditor";
import type { BodyProfileForm } from "@/utils/validators";

describe("normalizeKgWeight", () => {
  it("rounds stored decimals to whole kilograms", () => {
    expect(normalizeKgWeight(59.8)).toBe(60);
    expect(normalizeKgWeight(60.4)).toBe(60);
  });
});

describe("requiredKgWeightFormValue", () => {
  it("rounds user input to whole kilograms", () => {
    expect(requiredKgWeightFormValue("60")).toBe(60);
    expect(requiredKgWeightFormValue(59.8)).toBe(60);
  });
});

describe("bodyProfileToTryOnDefaults weight", () => {
  it("normalizes profile weight for the form", () => {
    expect(
      bodyProfileToTryOnDefaults({
        heightCm: 170,
        weightKg: 59.8,
        gender: "FEMALE",
      }).weightKg,
    ).toBe(60);
  });
});

describe("optionalNumberFormValue", () => {
  it("returns undefined for empty or NaN", () => {
    expect(optionalNumberFormValue("")).toBeUndefined();
    expect(optionalNumberFormValue(Number.NaN)).toBeUndefined();
  });

  it("preserves entered integers", () => {
    expect(optionalNumberFormValue("90")).toBe(90);
    expect(optionalNumberFormValue(90)).toBe(90);
  });
});

describe("formToBodyProfile measurements", () => {
  it("keeps exact measurement values from form data", () => {
    const data: BodyProfileForm = {
      heightCm: 170,
      weightKg: 60,
      age: 25,
      gender: "FEMALE",
      fitPreference: "REGULAR",
      chestCm: 90,
      waistCm: 70,
    };
    expect(formToBodyProfile(data).measurements).toEqual({
      chestCm: 90,
      waistCm: 70,
    });
  });
});
