import { describe, expect, it } from "vitest";
import { communityShareCaption, communityShareUrl } from "./community-share";
import { SITE_URL } from "./site-config";

describe("communityShareUrl", () => {
  it("builds an absolute permalink", () => {
    expect(communityShareUrl("a1b2c3d4")).toBe(`${SITE_URL}/outfit/a1b2c3d4`);
  });

  it("falls back to the site root for an empty code", () => {
    expect(communityShareUrl("  ")).toBe(SITE_URL);
  });
});

describe("communityShareCaption", () => {
  it("mentions the brands and the FitMe hashtags", () => {
    const caption = communityShareCaption({ brandNames: ["Coolmate", "Ownday"], styleLabel: "minimal" });
    expect(caption).toContain("Coolmate + Ownday");
    expect(caption).toContain("minimal");
    expect(caption).toContain("#FitMe");
  });

  it("keeps at most three brands", () => {
    const caption = communityShareCaption({ brandNames: ["A", "B", "C", "D"] });
    expect(caption).toContain("A + B + C");
    expect(caption).not.toContain("+ D");
  });

  it("works without brand or style", () => {
    const caption = communityShareCaption({});
    expect(caption).toContain("#FitMe");
    expect(caption).not.toContain("Style:");
  });
});
