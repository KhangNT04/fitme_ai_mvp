import { describe, expect, it, vi } from "vitest";
import { communityShareCaption, communityShareUrl, shareCommunityPost } from "./community-share";
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

describe("shareCommunityPost", () => {
  const options = { url: `${SITE_URL}/outfit/a1b2c3d4`, title: "Outfit", text: "caption" };

  it("returns shared when the share sheet completes", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    await expect(shareCommunityPost(options)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ url: options.url, title: options.title, text: options.text });
  });

  it("returns cancelled when the user dismisses the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    await expect(shareCommunityPost(options)).resolves.toBe("cancelled");
  });

  it("falls back to copying the link when the share sheet fails", async () => {
    const share = vi.fn().mockRejectedValue(new Error("not allowed"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    await expect(shareCommunityPost(options)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(options.url);
  });

  it("returns failed when nothing can be shared or copied", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => false });

    await expect(shareCommunityPost(options)).resolves.toBe("failed");
  });
});
