import { describe, expect, it } from "vitest";
import { filterProductsByCategory, matchesProductCategoryGroup, resolveProductCategoryGroup } from "./product-category";

describe("resolveProductCategoryGroup", () => {
  it("maps seed categories to filter groups", () => {
    expect(resolveProductCategoryGroup("Áo thun")).toBe("Áo");
    expect(resolveProductCategoryGroup("Áo sơ mi")).toBe("Áo");
    expect(resolveProductCategoryGroup("Quần jean")).toBe("Quần");
    expect(resolveProductCategoryGroup("Giày sneaker")).toBe("Giày");
    expect(resolveProductCategoryGroup("Áo khoác")).toBe("Áo khoác");
  });

  it("filters product list by group", () => {
    const items = [
      { id: "1", category: "Áo thun" },
      { id: "2", category: "Quần jean" },
      { id: "3", category: "Áo khoác" },
    ];
    expect(filterProductsByCategory(items, "Áo", "all").map((i) => i.id)).toEqual(["1"]);
    expect(filterProductsByCategory(items, "Quần", "all").map((i) => i.id)).toEqual(["2"]);
    expect(filterProductsByCategory(items, "all", "all")).toHaveLength(3);
  });
});
