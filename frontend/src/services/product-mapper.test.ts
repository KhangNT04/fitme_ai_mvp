import { describe, expect, it } from "vitest";
import { mapProduct, toBackendProductRequest } from "./product-mapper";

describe("product-mapper", () => {
  it("maps colors and sizes to variants", () => {
    const payload = toBackendProductRequest({
      name: "Shirt",
      category: "Áo",
      price: 200000,
      colors: ["Đen", "Trắng"],
      sizes: ["M", "L"],
      fitType: "REGULAR",
      styleTags: ["Casual"],
      occasionTags: ["Cafe"],
      purchaseUrl: "https://shopee.vn/shirt",
      images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });

    expect(payload.variants).toHaveLength(4);
    expect(payload.images).toHaveLength(2);
    expect(payload.images[0].imageType).toBe("MAIN");
    expect(payload.images[1].imageType).toBe("DETAIL");
    expect(payload.tags).toEqual([
      { tagType: "STYLE", tagValue: "Casual" },
      { tagType: "OCCASION", tagValue: "Cafe" },
    ]);
  });

  it("maps backend product response to frontend Product", () => {
    const product = mapProduct({
      id: "p1",
      brandId: "b1",
      brandName: "Brand",
      name: "Shirt",
      category: "Áo",
      price: 200000,
      purchaseUrl: "https://shopee.vn/shirt",
      status: "ACTIVE",
      aiTryOnEligible: true,
      images: [{ imageUrl: "https://a.jpg", imageType: "MAIN", sortOrder: 0 }],
      variants: [{ colorName: "Đen", sizeLabel: "M" }],
      tags: [{ tagType: "STYLE", tagValue: "Casual" }],
      sizeCharts: [{ sizeLabel: "M", chestCm: 90, waistCm: 72, hipCm: 94 }],
    });

    expect(product.images).toEqual(["https://a.jpg"]);
    expect(product.colors).toEqual(["Đen"]);
    expect(product.sizes).toEqual(["M"]);
    expect(product.sizeCharts?.[0].sizeLabel).toBe("M");
  });
});
