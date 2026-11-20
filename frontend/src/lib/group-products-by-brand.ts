import type { Product } from "@/types/product";

/** Max products shown per brand row on Discover (newest first). */
export const DISCOVER_PRODUCTS_PER_BRAND = 10;

export function groupProductsByBrand(items: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>();
  for (const product of items) {
    const existing = groups.get(product.brandId);
    if (existing) {
      existing.push(product);
    } else {
      groups.set(product.brandId, [product]);
    }
  }
  return groups;
}

function createdAtMs(product: Product): number {
  if (!product.createdAt) return 0;
  const ms = Date.parse(product.createdAt);
  return Number.isFinite(ms) ? ms : 0;
}

/** Newest first; stable tie-break on id. */
export function sortProductsNewestFirst(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const byDate = createdAtMs(b) - createdAtMs(a);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
}

export type BrandProductPreview = {
  products: Product[];
  total: number;
};

/** Group by brand, keep only the newest `limitPerBrand` items for the Discover row. */
export function groupNewestProductsByBrand(
  items: Product[],
  limitPerBrand: number = DISCOVER_PRODUCTS_PER_BRAND,
): Map<string, BrandProductPreview> {
  const grouped = groupProductsByBrand(items);
  const out = new Map<string, BrandProductPreview>();
  for (const [brandId, list] of grouped) {
    const sorted = sortProductsNewestFirst(list);
    out.set(brandId, {
      total: sorted.length,
      products: sorted.slice(0, Math.max(0, limitPerBrand)),
    });
  }
  return out;
}
