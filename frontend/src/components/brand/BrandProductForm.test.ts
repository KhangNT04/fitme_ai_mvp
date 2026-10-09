import { describe, expect, it } from "vitest";
import { effectiveTryOnImage, emptyBrandProductForm, formValuesToRequest } from "./BrandProductForm";

describe("effectiveTryOnImage", () => {
  const images = "https://a.jpg\nhttps://b.jpg";

  it("keeps the brand's pick while it is still in the gallery", () => {
    expect(effectiveTryOnImage({ category: "Áo", imageUrls: images, tryOnImage: "https://b.jpg" })).toBe("https://b.jpg");
  });

  it("falls back to the first image when the pick was removed or never made", () => {
    expect(effectiveTryOnImage({ category: "Áo", imageUrls: images, tryOnImage: "https://gone.jpg" })).toBe("https://a.jpg");
    expect(effectiveTryOnImage({ category: "Quần", imageUrls: images, tryOnImage: "" })).toBe("https://a.jpg");
  });

  it("has no try-on image for accessories and shoes", () => {
    expect(effectiveTryOnImage({ category: "Phụ kiện", imageUrls: images, tryOnImage: "https://b.jpg" })).toBeUndefined();
    expect(effectiveTryOnImage({ category: "Giày", imageUrls: images, tryOnImage: "" })).toBeUndefined();
  });

  it("is sent with the create/update request", () => {
    const form = { ...emptyBrandProductForm(), category: "Váy", imageUrls: images, tryOnImage: "https://b.jpg" };
    expect(formValuesToRequest(form).tryOnImage).toBe("https://b.jpg");
  });
});
