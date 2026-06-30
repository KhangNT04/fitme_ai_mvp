import type { Product } from "@/types/product";

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
