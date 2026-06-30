import { describe, expect, it } from "vitest";
import { PLACEHOLDER_PRODUCT, resolveImageList, resolveImageSrc } from "./media-url";

describe("resolveImageSrc", () => {
  it("passes through absolute and app-relative URLs", () => {
    expect(resolveImageSrc("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(resolveImageSrc("/uploads/wardrobe/x.jpg")).toBe("/uploads/wardrobe/x.jpg");
  });

  it("uses placeholder for empty or invalid values", () => {
    expect(resolveImageSrc(undefined)).toBe(PLACEHOLDER_PRODUCT);
    expect(resolveImageSrc("")).toBe(PLACEHOLDER_PRODUCT);
    expect(resolveImageSrc("not-a-valid-url")).toBe(PLACEHOLDER_PRODUCT);
  });

  it("resolves image lists with fallback", () => {
    expect(resolveImageList(["/uploads/a.jpg", ""])).toEqual(["/uploads/a.jpg"]);
    expect(resolveImageList([])).toEqual([PLACEHOLDER_PRODUCT]);
  });
});
