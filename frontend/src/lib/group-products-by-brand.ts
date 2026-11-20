import type { Product } from "@/types/product";

/** Max products shown per brand row on Discover (newest first). */
export const DISCOVER_PRODUCTS_PER_BRAND = 10;

/** Brands per Discover page — each page only mounts this many brand rows. */
export const DISCOVER_BRANDS_PER_PAGE = 10;

/** Max AI-eligible products per brand row on Try-on hub. */
export const TRYON_PRODUCTS_PER_BRAND = 10;

/** Brands per Try-on hub page — keeps DOM/image budget similar to Discover. */
export const TRYON_BRANDS_PER_PAGE = 10;

/** First N brand rows on a page get eager image loads (LCP); the rest stay lazy. */
export const CATALOG_EAGER_BRAND_ROWS = 2;

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
    // Prefer API brandProductTotal when BE already applied limitPerBrand.
    const fromApi = sorted.find((p) => p.brandProductTotal != null)?.brandProductTotal;
    out.set(brandId, {
      total: fromApi ?? sorted.length,
      products: sorted.slice(0, Math.max(0, limitPerBrand)),
    });
  }
  return out;
}
