import type { Product, ProductStatus } from "@/types/product";

/** Draft & pending review first — action items for brand owners. */
const STATUS_PRIORITY: Record<ProductStatus, number> = {
  DRAFT: 0,
  PENDING_REVIEW: 1,
  REJECTED: 2,
  FLAGGED: 3,
  ACTIVE: 4,
  INACTIVE: 5,
};

export function sortBrandProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const rankA = STATUS_PRIORITY[a.status] ?? 99;
    const rankB = STATUS_PRIORITY[b.status] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name, "vi");
  });
}
