import { describe, expect, it } from "vitest";
import { outfitItemDetailHref, outfitItemShowPrice, outfitItemToProduct } from "./outfit-product-mapper";
import type { OutfitItem } from "@/types/outfit";

const brandItem: OutfitItem = {
  id: "p1",
  productId: "p1",
  name: "Áo sơ mi trắng",
  category: "TOP",
  color: "Trắng",
  size: "M",
  price: 450000,
  imageUrl: "/uploads/x.jpg",
  fromWardrobe: false,
};

const wardrobeItem: OutfitItem = {
  id: "w1",
  wardrobeItemId: "w1",
  name: "Quần jean",
  category: "BOTTOM",
  color: "Xanh",
  fromWardrobe: true,
  imageUrl: "/uploads/w.jpg",
};

describe("outfitItemToProduct", () => {
  it("maps brand products for catalog cards", () => {
    const product = outfitItemToProduct(brandItem);
    expect(product.id).toBe("p1");
    expect(product.images[0]).toBe("/uploads/x.jpg");
    expect(product.aiTryOnEligible).toBe(true);
    expect(outfitItemDetailHref(brandItem, "rec-1")).toBe(
      "/products/p1?from=ai-result&recommendation=rec-1",
    );
  });

  it("maps wardrobe items without try-on", () => {
    const product = outfitItemToProduct(wardrobeItem);
    expect(product.brandName).toBe("Tủ đồ của bạn");
    expect(product.aiTryOnEligible).toBe(false);
    expect(outfitItemDetailHref(wardrobeItem)).toBe("/wardrobe");
  });

  it("hides price for wardrobe items", () => {
    expect(outfitItemShowPrice(brandItem)).toBe(true);
    expect(outfitItemShowPrice(wardrobeItem)).toBe(false);
  });
});
