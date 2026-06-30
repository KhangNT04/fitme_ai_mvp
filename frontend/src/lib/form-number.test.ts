import { describe, expect, it } from "vitest";
import { optionalNumberFormValue } from "./form-number";
import { formToBodyProfile } from "@/components/profile/BodyProfileEditor";
import type { BodyProfileForm } from "@/utils/validators";

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
      chestCm: 90,
      waistCm: 70,
    };
    expect(formToBodyProfile(data).measurements).toEqual({
      chestCm: 90,
      waistCm: 70,
    });
  });
});
