import { describe, expect, it } from "vitest";
import {
  findVariant,
  getVariantOptions,
  isColorAvailable,
  isSizeAvailable,
  pickInitialVariant,
  resolveSelection,
  sortSizeLabels,
  stockHint,
} from "./variant-selection";
import type { ProductVariant } from "@/types/product";

const variants: ProductVariant[] = [
  { id: "1", colorName: "Đen", colorHex: "#000", sizeLabel: "S", stockQuantity: 0 },
  { id: "2", colorName: "Đen", colorHex: "#000", sizeLabel: "M", stockQuantity: 3 },
  { id: "3", colorName: "Trắng", colorHex: "#fff", sizeLabel: "S", stockQuantity: 10 },
  { id: "4", colorName: "Trắng", colorHex: "#fff", sizeLabel: "M", stockQuantity: 0 },
];

describe("variant-selection", () => {
  it("lists unique colors and sizes", () => {
    const { colors, sizes } = getVariantOptions(variants);
    expect(colors.map((c) => c.name)).toEqual(["Đen", "Trắng"]);
    expect(colors[0].hex).toBe("#000");
    expect(sizes).toEqual(["S", "M"]);
  });

  it("orders sizes S to XL regardless of variant order", () => {
    const shuffled = ["M", "L", "XL", "S"].map((sizeLabel, i) => ({ id: String(i), sizeLabel, stockQuantity: 1 }));
    expect(getVariantOptions(shuffled).sizes).toEqual(["S", "M", "L", "XL"]);
    expect(sortSizeLabels(["32", "28", "Free Size", "30"])).toEqual(["Free Size", "28", "30", "32"]);
  });

  it("finds a variant by color + size", () => {
    expect(findVariant(variants, "Trắng", "S")?.id).toBe("3");
    expect(findVariant(variants, "Đen", "L")).toBeUndefined();
  });

  it("picks the first in-stock variant initially", () => {
    expect(pickInitialVariant(variants)?.id).toBe("2");
    expect(pickInitialVariant(variants.map((v) => ({ ...v, stockQuantity: 0 })))?.id).toBe("1");
    expect(pickInitialVariant([])).toBeUndefined();
  });

  it("checks availability per axis", () => {
    expect(isColorAvailable(variants, "Đen")).toBe(true);
    expect(isColorAvailable(variants, "Đen", "S")).toBe(false);
    expect(isSizeAvailable(variants, "M")).toBe(true);
    expect(isSizeAvailable(variants, "M", "Trắng")).toBe(false);
  });

  it("keeps the other axis when the combination is in stock", () => {
    expect(resolveSelection(variants, { color: "Trắng" }, { color: "Đen", size: "S" })).toEqual({
      color: "Trắng",
      size: "S",
    });
  });

  it("snaps the other axis when the combination is sold out", () => {
    // Đen/S is sold out → switching size to S while on Đen moves to Trắng/S.
    expect(resolveSelection(variants, { size: "S" }, { color: "Đen", size: "M" })).toEqual({
      color: "Trắng",
      size: "S",
    });
    // Trắng/M sold out → switching color to Trắng from Đen/M snaps size to S.
    expect(resolveSelection(variants, { color: "Trắng" }, { color: "Đen", size: "M" })).toEqual({
      color: "Trắng",
      size: "S",
    });
  });

  it("describes stock levels", () => {
    expect(stockHint(variants[0])).toBe("Hết hàng");
    expect(stockHint(variants[1])).toBe("Chỉ còn 3 sản phẩm");
    expect(stockHint(variants[2])).toBeNull();
    expect(stockHint(undefined)).toBeNull();
  });
});
