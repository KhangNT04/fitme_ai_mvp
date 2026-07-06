import { describe, expect, it } from "vitest";
import {
  EXPIRED_VTON_OUTPUT_PLACEHOLDER,
  PLACEHOLDER_PRODUCT,
  isEphemeralVtonOutputUrl,
  resolveImageList,
  resolveImageSrc,
  resolveOptionalImageSrc,
} from "./media-url";

describe("resolveImageSrc", () => {
  it("passes through absolute and app-relative URLs", () => {
    expect(resolveImageSrc("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(resolveImageSrc("/uploads/wardrobe/x.jpg")).toBe("/uploads/wardrobe/x.jpg");
    expect(resolveImageSrc("https://pub.example.r2.dev/user-photos/x.jpg")).toBe("/uploads/user-photos/x.jpg");
  });

  it("uses placeholder for ephemeral ai-vton output URLs", () => {
    const expired = "https://fitme-ai-vton.onrender.com/outputs/abc.jpg";
    expect(isEphemeralVtonOutputUrl(expired)).toBe(true);
    expect(resolveImageSrc(expired)).toBe(EXPIRED_VTON_OUTPUT_PLACEHOLDER);
    expect(resolveOptionalImageSrc(expired)).toBe(EXPIRED_VTON_OUTPUT_PLACEHOLDER);
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
