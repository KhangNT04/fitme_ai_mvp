import { describe, expect, it } from "vitest";
import {
  hasOutfitItem,
  outfitItemKey,
  productToOutfitItem,
  wardrobeToOutfitItem,
} from "./outfit-item-utils";
import type { Product } from "@/types/product";

const product: Product = {
  id: "p1",
  brandId: "b1",
  brandName: "Brand",
  name: "Áo thun",
  category: "Áo",
  price: 200000,
  images: ["/img.jpg"],
  colors: ["Đen"],
  sizes: ["M"],
  fitType: "REGULAR",
  styleTags: [],
  occasionTags: [],
  purchaseUrl: "/buy",
  stockStatus: "IN_STOCK",
  status: "ACTIVE",
  aiTryOnEligible: true,
};

describe("outfit-item-utils", () => {
  it("builds outfit items from catalog products", () => {
    const item = productToOutfitItem(product);
    expect(item.productId).toBe("p1");
    expect(item.fromWardrobe).toBe(false);
  });

  it("builds outfit items from wardrobe", () => {
    const item = wardrobeToOutfitItem({
      id: "w1",
      itemType: "Quần jean",
      category: "Quần",
      color: "Xanh",
      styleTags: [],
      createdAt: "2024-01-01",
    });
    expect(outfitItemKey(item)).toBe("w1");
    expect(item.fromWardrobe).toBe(true);
  });

  it("detects duplicate items", () => {
    const items = [productToOutfitItem(product)];
    expect(hasOutfitItem(items, { id: "p1", productId: "p1" })).toBe(true);
    expect(hasOutfitItem(items, { id: "p2", productId: "p2" })).toBe(false);
  });
});
