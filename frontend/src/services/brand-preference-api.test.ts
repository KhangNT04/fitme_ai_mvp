import { describe, expect, it } from "vitest";
import { MAX_FAVORITE_BRANDS, toggleFavoriteBrand, validateBrandPreferences } from "./brand-preference-api";

describe("toggleFavoriteBrand", () => {
  it("adds and removes brands", () => {
    expect(toggleFavoriteBrand([], "a")).toEqual(["a"]);
    expect(toggleFavoriteBrand(["a", "b"], "a")).toEqual(["b"]);
  });

  it("stops at the maximum number of favorites", () => {
    const full = Array.from({ length: MAX_FAVORITE_BRANDS }, (_, i) => `brand-${i}`);
    expect(toggleFavoriteBrand(full, "extra")).toBe(full);
    expect(toggleFavoriteBrand(full, "brand-0")).toHaveLength(MAX_FAVORITE_BRANDS - 1);
  });
});

describe("validateBrandPreferences", () => {
  it("accepts a valid selection", () => {
    expect(validateBrandPreferences({ mode: "DIVERSE", brandIds: [] })).toBeNull();
    expect(validateBrandPreferences({ mode: "FAVORITES_ONLY", brandIds: ["a"] })).toBeNull();
  });

  it("requires a brand for favorites-only mode", () => {
    expect(validateBrandPreferences({ mode: "FAVORITES_ONLY", brandIds: [] })).toBe(
      "Chọn ít nhất 1 brand để dùng chế độ chỉ brand yêu thích",
    );
  });

  it("rejects more than 10 brands", () => {
    const ids = Array.from({ length: 11 }, (_, i) => `b${i}`);
    expect(validateBrandPreferences({ mode: "DIVERSE", brandIds: ids })).toBe("Chỉ chọn tối đa 10 brand yêu thích");
  });
});
