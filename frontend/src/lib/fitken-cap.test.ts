import { describe, expect, it } from "vitest";
import { fitkenCapMessage, fitkenCapProgressLabel, isAtFreeFitkenCap, isRewardCapped } from "./fitken-cap";

describe("fitkenCapMessage", () => {
  it("returns null when the full reward was credited", () => {
    expect(fitkenCapMessage({ rewardGranted: 3, rewardIntended: 3, rewardCapped: false, maxBalance: 50 })).toBeNull();
    expect(fitkenCapMessage({ rewardGranted: 3 })).toBeNull();
  });

  it("explains a partially credited reward with the cap", () => {
    expect(fitkenCapMessage({ rewardGranted: 2, rewardIntended: 3, rewardCapped: true, maxBalance: 50 })).toBe(
      "Ví đã đạt trần 50 Fitken miễn phí nên chỉ cộng 2 Fitken",
    );
  });

  it("says the wallet is full when nothing was credited", () => {
    expect(fitkenCapMessage({ rewardGranted: 0, rewardIntended: 3, rewardCapped: true, maxBalance: 50 })).toBe(
      "Ví đã đầy, không cộng thêm",
    );
  });

  it("infers capping from intended vs granted when the flag is missing", () => {
    expect(isRewardCapped({ rewardGranted: 1, rewardIntended: 3 })).toBe(true);
    expect(isRewardCapped({ rewardGranted: 0, rewardIntended: 0 })).toBe(false);
  });
});

describe("fitkenCapProgressLabel", () => {
  it("formats balance against the cap", () => {
    expect(fitkenCapProgressLabel(12, 50)).toBe("12 / 50 Fitken miễn phí");
  });

  it("hides the hint without a cap", () => {
    expect(fitkenCapProgressLabel(12, undefined)).toBeNull();
    expect(fitkenCapProgressLabel(12, 0)).toBeNull();
  });
});

describe("isAtFreeFitkenCap", () => {
  it("is true once the balance reaches the cap", () => {
    expect(isAtFreeFitkenCap(50, 50)).toBe(true);
    expect(isAtFreeFitkenCap(65, 50)).toBe(true);
    expect(isAtFreeFitkenCap(49, 50)).toBe(false);
    expect(isAtFreeFitkenCap(49, null)).toBe(false);
  });
});
