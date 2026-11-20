import { describe, expect, it } from "vitest";
import type { Product } from "@/types/product";
import {
  DISCOVER_PRODUCTS_PER_BRAND,
  groupNewestProductsByBrand,
  sortProductsNewestFirst,
} from "./group-products-by-brand";

function product(partial: Partial<Product> & Pick<Product, "id" | "brandId" | "createdAt">): Product {
  return {
    brandName: "Brand",
    name: partial.id,
    category: "Áo",
    price: 100000,
    images: [],
    colors: [],
    sizes: [],
    fitType: "REGULAR",
    styleTags: [],
    occasionTags: [],
    purchaseUrl: "https://example.com",
    stockStatus: "IN_STOCK",
    status: "ACTIVE",
    aiTryOnEligible: true,
    ...partial,
  };
}

describe("groupNewestProductsByBrand", () => {
  it("keeps only the newest N products per brand", () => {
    const items = [
      product({ id: "old", brandId: "hows", createdAt: "2026-01-01T00:00:00Z" }),
      product({ id: "new", brandId: "hows", createdAt: "2026-11-01T00:00:00Z" }),
      product({ id: "mid", brandId: "hows", createdAt: "2026-06-01T00:00:00Z" }),
      product({ id: "t1", brandId: "teelab", createdAt: "2026-10-01T00:00:00Z" }),
    ];

    const grouped = groupNewestProductsByBrand(items, 2);
    const hows = grouped.get("hows")!;
    expect(hows.total).toBe(3);
    expect(hows.products.map((p) => p.id)).toEqual(["new", "mid"]);
    expect(grouped.get("teelab")!.products.map((p) => p.id)).toEqual(["t1"]);
  });

  it("defaults to Discover limit of 10", () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      product({
        id: `p${i}`,
        brandId: "hows",
        createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      }),
    );
    const grouped = groupNewestProductsByBrand(items);
    expect(DISCOVER_PRODUCTS_PER_BRAND).toBe(10);
    expect(grouped.get("hows")!.products).toHaveLength(10);
    expect(grouped.get("hows")!.total).toBe(15);
    expect(sortProductsNewestFirst(items)[0].id).toBe("p14");
  });

  it("prefers brandProductTotal from API when preview is already limited", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      product({
        id: `p${i}`,
        brandId: "hows",
        createdAt: `2026-11-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        brandProductTotal: 42,
      }),
    );
    const grouped = groupNewestProductsByBrand(items, 10);
    expect(grouped.get("hows")!.products).toHaveLength(10);
    expect(grouped.get("hows")!.total).toBe(42);
  });
});
