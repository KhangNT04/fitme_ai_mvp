import { describe, expect, it } from "vitest";
import { nextProfileStep, profileChecklist, profileCompletionPercent } from "./profile-progress";
import type { ProfileSummary } from "@/types/profile";

function summary(overrides: Partial<ProfileSummary> = {}): ProfileSummary {
  return {
    completionRatio: 0,
    bodyProfileComplete: false,
    measurementsComplete: false,
    styleProfileComplete: false,
    brandPreferencesComplete: false,
    emailVerified: false,
    twoFactorEnabled: false,
    galleryImages: 0,
    savedOutfits: 0,
    savedTryOns: 0,
    wardrobeItems: 0,
    checkinStreak: 0,
    fitkenBalance: 0,
    fitkenEarnedThisMonth: 0,
    communityPosts: 0,
    communityFollowers: 0,
    nextStep: null,
    ...overrides,
  };
}

describe("profileChecklist", () => {
  it("always lists the five steps in a stable order", () => {
    const steps = profileChecklist(summary());
    expect(steps.map((step) => step.key)).toEqual([
      "BODY_PROFILE",
      "MEASUREMENTS",
      "STYLE_PROFILE",
      "EMAIL_VERIFIED",
      "TWO_FACTOR",
    ]);
  });

  it("marks the steps that are done", () => {
    const steps = profileChecklist(summary({ bodyProfileComplete: true, emailVerified: true }));
    expect(steps.find((step) => step.key === "BODY_PROFILE")?.done).toBe(true);
    expect(steps.find((step) => step.key === "EMAIL_VERIFIED")?.done).toBe(true);
    expect(steps.find((step) => step.key === "TWO_FACTOR")?.done).toBe(false);
  });
});

describe("profileCompletionPercent", () => {
  it("is 0 for an empty profile", () => {
    expect(profileCompletionPercent(summary())).toBe(0);
  });

  it("is 100 when everything is done", () => {
    expect(
      profileCompletionPercent(
        summary({
          bodyProfileComplete: true,
          measurementsComplete: true,
          styleProfileComplete: true,
          emailVerified: true,
          twoFactorEnabled: true,
        }),
      ),
    ).toBe(100);
  });

  it("rounds to the nearest percent", () => {
    // 2 of 5 steps done = 40%
    expect(profileCompletionPercent(summary({ bodyProfileComplete: true, emailVerified: true }))).toBe(40);
  });
});

describe("nextProfileStep", () => {
  it("points at the first unfinished step", () => {
    expect(nextProfileStep(summary({ bodyProfileComplete: true }))?.key).toBe("MEASUREMENTS");
  });

  it("returns null when the profile is complete", () => {
    expect(
      nextProfileStep(
        summary({
          bodyProfileComplete: true,
          measurementsComplete: true,
          styleProfileComplete: true,
          emailVerified: true,
          twoFactorEnabled: true,
        }),
      ),
    ).toBeNull();
  });
});
