import { describe, expect, it } from "vitest";
import { sortBrandProducts } from "./sort-brand-products";
import type { Product } from "@/types/product";

function product(id: string, status: Product["status"], name: string): Product {
  return {
    id,
    brandId: "b1",
    brandName: "Brand",
    name,
    category: "Áo",
    price: 100_000,
    images: [],
    colors: [],
    sizes: [],
    fitType: "REGULAR",
    styleTags: [],
    occasionTags: [],
    purchaseUrl: "https://example.com",
    stockStatus: "IN_STOCK",
    status,
    aiTryOnEligible: false,
  };
}

describe("sortBrandProducts", () => {
  it("puts draft and pending review before active products", () => {
    const sorted = sortBrandProducts([
      product("1", "ACTIVE", "Zeta"),
      product("2", "DRAFT", "Alpha"),
      product("3", "PENDING_REVIEW", "Beta"),
    ]);

    expect(sorted.map((p) => p.status)).toEqual(["DRAFT", "PENDING_REVIEW", "ACTIVE"]);
    expect(sorted.map((p) => p.name)).toEqual(["Alpha", "Beta", "Zeta"]);
  });
});
