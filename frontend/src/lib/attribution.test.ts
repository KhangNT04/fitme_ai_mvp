import { beforeEach, describe, expect, it } from "vitest";
import { attributionFromLanding, captureAttribution, getSignupAttribution } from "./attribution";

describe("attributionFromLanding", () => {
  it("reads UTM params", () => {
    expect(
      attributionFromLanding(
        "https://fitme.vn/?utm_source=tiktok&utm_medium=social&utm_campaign=launch%20oct",
        "",
      ),
    ).toEqual({ utmSource: "tiktok", utmMedium: "social", utmCampaign: "launch oct", referrer: undefined });
  });

  it("falls back to the external referrer host", () => {
    expect(attributionFromLanding("https://fitme.vn/discover", "https://www.facebook.com/groups/abc?x=1")).toEqual({
      utmSource: "facebook.com",
      utmMedium: "referral",
      utmCampaign: undefined,
      referrer: "https://www.facebook.com/groups/abc",
    });
  });

  it("ignores direct and same-site visits", () => {
    expect(attributionFromLanding("https://fitme.vn/", "")).toBeNull();
    expect(attributionFromLanding("https://fitme.vn/pricing", "https://fitme.vn/")).toBeNull();
  });
});

describe("captureAttribution", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the first touch", () => {
    window.history.replaceState(null, "", "/?utm_source=tiktok");
    captureAttribution();
    window.history.replaceState(null, "", "/?utm_source=facebook");
    captureAttribution();
    expect(getSignupAttribution().utmSource).toBe("tiktok");
    window.history.replaceState(null, "", "/");
  });

  it("returns nothing when no touch was captured", () => {
    expect(getSignupAttribution()).toEqual({});
  });
});
