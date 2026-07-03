import { describe, expect, it } from "vitest";
import { mapCategoryToRole, mergeTryOnSelection, getTryOnItemsToReplace, buildTryOnReplaceConfirmMessage } from "./tryon-role";
import type { TryOnItem } from "@/types/tryon";

const topA: TryOnItem = { productId: "top-a", category: "Áo thun", name: "Áo A" };
const topB: TryOnItem = { productId: "top-b", category: "Áo sơ mi", name: "Áo B" };
const bottom: TryOnItem = { productId: "bottom-a", category: "Quần jean", name: "Quần A" };
const dress: TryOnItem = { productId: "dress-a", category: "Váy midi", name: "Váy A" };

describe("mapCategoryToRole", () => {
  it("maps Vietnamese categories to roles", () => {
    expect(mapCategoryToRole("Áo thun")).toBe("TOP");
    expect(mapCategoryToRole("Quần jean")).toBe("BOTTOM");
    expect(mapCategoryToRole("Váy wrap")).toBe("ONE_PIECE");
    expect(mapCategoryToRole("Giày sneaker")).toBe("SHOES");
  });
});

describe("mergeTryOnSelection", () => {
  it("replaces another top when selecting a second top", () => {
    const { items, result } = mergeTryOnSelection([topA, bottom], topB);
    expect(result).toBe("replaced");
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.productId)).toEqual(["bottom-a", "top-b"]);
  });

  it("clears top and bottom when adding a one-piece", () => {
    const { items, result } = mergeTryOnSelection([topA, bottom], dress);
    expect(result).toBe("replaced");
    expect(items).toEqual([dress]);
  });

  it("clears one-piece when adding a top", () => {
    const { items, result } = mergeTryOnSelection([dress], topA);
    expect(result).toBe("replaced");
    expect(items).toEqual([topA]);
  });

  it("returns unchanged for duplicate product", () => {
    const { items, result } = mergeTryOnSelection([topA], topA);
    expect(result).toBe("unchanged");
    expect(items).toEqual([topA]);
  });
});

describe("getTryOnItemsToReplace", () => {
  it("returns existing top when adding another top", () => {
    expect(getTryOnItemsToReplace([topA, bottom], topB)).toEqual([topA]);
  });

  it("returns empty when product already selected", () => {
    expect(getTryOnItemsToReplace([topA], topA)).toEqual([]);
  });
});

describe("buildTryOnReplaceConfirmMessage", () => {
  it("mentions both product names for single replacement", () => {
    const message = buildTryOnReplaceConfirmMessage([topA], topB);
    expect(message.description).toContain("Áo A");
    expect(message.description).toContain("Áo B");
  });
});
