import { describe, expect, it } from "vitest";
import { REDIRECT_CHANNELS } from "@/types/redirect";
import { REDIRECT_CHANNEL_LABELS, isRedirectChannel, redirectChannelLabel } from "./redirect-channel";

describe("redirect-channel", () => {
  it("has a Vietnamese label for every backend purchase channel", () => {
    expect(REDIRECT_CHANNELS).toEqual(["SHOPEE", "TIKTOK_SHOP", "BRAND_WEBSITE", "INSTAGRAM", "FACEBOOK", "OTHER"]);
    for (const channel of REDIRECT_CHANNELS) {
      expect(REDIRECT_CHANNEL_LABELS[channel]).toBeTruthy();
    }
    expect(redirectChannelLabel("BRAND_WEBSITE")).toBe("Website chính hãng");
    expect(redirectChannelLabel("TIKTOK_SHOP")).toBe("TikTok Shop");
  });

  it("falls back to a generic store for unknown or missing channels", () => {
    expect(isRedirectChannel("WEBSITE")).toBe(false);
    expect(redirectChannelLabel("WEBSITE")).toBe("Cửa hàng khác");
    expect(redirectChannelLabel(undefined)).toBe("Cửa hàng khác");
    expect(redirectChannelLabel(null)).toBe("Cửa hàng khác");
  });
});
