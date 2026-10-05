import type { ProductVariant } from "@/types/product";

export interface VariantOptions {
  colors: { name: string; hex?: string }[];
  sizes: string[];
}

const LETTER_SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "FREESIZE", "FREE SIZE"];

function sizeRank(label: string): number {
  const upper = label.trim().toUpperCase();
  const letter = LETTER_SIZE_ORDER.indexOf(upper);
  if (letter >= 0) return letter;
  const numeric = Number.parseFloat(upper);
  return Number.isFinite(numeric) ? 1000 + numeric : Number.MAX_SAFE_INTEGER;
}

/** Orders size labels S → M → L → XL (numeric sizes ascending); unknown labels keep their order at the end. */
export function sortSizeLabels(sizes: readonly string[]): string[] {
  return sizes
    .map((size, index) => ({ size, index, rank: sizeRank(size) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.size);
}

/** Unique colors (with hex) in variant order and sizes in size order. */
export function getVariantOptions(variants: ProductVariant[]): VariantOptions {
  const colors: VariantOptions["colors"] = [];
  const sizes: string[] = [];
  for (const v of variants) {
    if (v.colorName && !colors.some((c) => c.name === v.colorName)) {
      colors.push({ name: v.colorName, hex: v.colorHex });
    }
    if (v.sizeLabel && !sizes.includes(v.sizeLabel)) sizes.push(v.sizeLabel);
  }
  return { colors, sizes: sortSizeLabels(sizes) };
}

export function findVariant(
  variants: ProductVariant[],
  color: string | undefined,
  size: string | undefined,
): ProductVariant | undefined {
  return variants.find((v) => (v.colorName ?? undefined) === color && (v.sizeLabel ?? undefined) === size);
}

export function isVariantInStock(variant: ProductVariant | undefined): boolean {
  return !!variant && variant.stockQuantity > 0;
}

/** Initial selection: first in-stock variant, else the first variant. */
export function pickInitialVariant(variants: ProductVariant[]): ProductVariant | undefined {
  return variants.find(isVariantInStock) ?? variants[0];
}

/** Is any variant of this color in stock (optionally restricted to a size)? */
export function isColorAvailable(variants: ProductVariant[], color: string, size?: string): boolean {
  return variants.some(
    (v) => v.colorName === color && (size === undefined || v.sizeLabel === size) && v.stockQuantity > 0,
  );
}

export function isSizeAvailable(variants: ProductVariant[], size: string, color?: string): boolean {
  return variants.some(
    (v) => v.sizeLabel === size && (color === undefined || v.colorName === color) && v.stockQuantity > 0,
  );
}

export interface VariantSelection {
  color: string | undefined;
  size: string | undefined;
}

/**
 * After the user changes one axis, keep the other if that combination exists (preferring in-stock),
 * otherwise snap the other axis to the best matching variant.
 */
export function resolveSelection(
  variants: ProductVariant[],
  change: { color: string } | { size: string },
  current: VariantSelection,
): VariantSelection {
  if ("color" in change) {
    const exact = findVariant(variants, change.color, current.size);
    if (exact && isVariantInStock(exact)) return { color: change.color, size: current.size };
    const sameColor = variants.filter((v) => v.colorName === change.color);
    const best = sameColor.find(isVariantInStock) ?? exact ?? sameColor[0];
    return { color: change.color, size: best ? best.sizeLabel : current.size };
  }
  const exact = findVariant(variants, current.color, change.size);
  if (exact && isVariantInStock(exact)) return { color: current.color, size: change.size };
  const sameSize = variants.filter((v) => v.sizeLabel === change.size);
  const best = sameSize.find(isVariantInStock) ?? exact ?? sameSize[0];
  return { color: best ? best.colorName : current.color, size: change.size };
}

export function stockHint(variant: ProductVariant | undefined): string | null {
  if (!variant) return null;
  if (variant.stockQuantity <= 0) return "Hết hàng";
  if (variant.stockQuantity <= 5) return `Chỉ còn ${variant.stockQuantity} sản phẩm`;
  return null;
}
