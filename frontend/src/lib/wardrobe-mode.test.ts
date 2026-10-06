import { describe, expect, it } from "vitest";
import { effectiveWardrobeMode, usesWardrobe, wardrobeModeOptions } from "./wardrobe-mode";

describe("wardrobe mode gating", () => {
  it("detects modes that read the personal wardrobe", () => {
    expect(usesWardrobe("USE_WARDROBE_FIRST")).toBe(true);
    expect(usesWardrobe("MIX_WARDROBE_AND_BRAND")).toBe(true);
    expect(usesWardrobe("NO_WARDROBE_DATA")).toBe(false);
    expect(usesWardrobe("NEW_ITEMS_ONLY")).toBe(false);
    expect(usesWardrobe(undefined)).toBe(false);
  });

  it("falls back to brand-only for Free users", () => {
    expect(effectiveWardrobeMode("MIX_WARDROBE_AND_BRAND", false)).toBe("NO_WARDROBE_DATA");
    expect(effectiveWardrobeMode("USE_WARDROBE_FIRST", false)).toBe("NO_WARDROBE_DATA");
    expect(effectiveWardrobeMode("NEW_ITEMS_ONLY", false)).toBe("NEW_ITEMS_ONLY");
    expect(effectiveWardrobeMode(undefined, false)).toBe("NO_WARDROBE_DATA");
  });

  it("keeps the requested mode for Premium users", () => {
    expect(effectiveWardrobeMode("USE_WARDROBE_FIRST", true)).toBe("USE_WARDROBE_FIRST");
  });

  it("locks wardrobe options for Free users only", () => {
    const free = wardrobeModeOptions(false);
    expect(free.filter((o) => o.locked).map((o) => o.value)).toEqual(["MIX_WARDROBE_AND_BRAND", "USE_WARDROBE_FIRST"]);
    expect(free.find((o) => o.value === "NO_WARDROBE_DATA")?.locked).toBe(false);
    expect(wardrobeModeOptions(true).some((o) => o.locked)).toBe(false);
  });
});
