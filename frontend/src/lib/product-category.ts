import { PRODUCT_CATEGORIES } from "@/utils/constants";

const CANONICAL = new Set<string>(PRODUCT_CATEGORIES);

/** Map stored product categories to the six Discover filter groups. */
export function resolveProductCategoryGroup(category?: string | null): string | null {
  if (!category?.trim()) return null;

  const trimmed = category.trim();
  if (CANONICAL.has(trimmed)) return trimmed;

  const normalized = trimmed.toLowerCase();

  if (/khoác|outerwear|jacket|coat|blazer/.test(normalized)) return "Áo khoác";
  if (/phụ kiện|accessory|accessories|túi|bag|mũ|hat|belt/.test(normalized)) return "Phụ kiện";
  if (/giày|sneaker|shoe|boot|sandal|footwear/.test(normalized)) return "Giày";
  if (/váy|dress|skirt|one[-_\s]?piece/.test(normalized)) return "Váy";
  if (/quần|bottom|jean|pant|trouser|short/.test(normalized)) return "Quần";
  if (
    normalized.startsWith("áo") ||
    /top|shirt|tee|t-shirt|blouse|sơ mi|thun|hoodie|sweater/.test(normalized)
  ) {
    return "Áo";
  }

  return trimmed;
}

export function matchesProductCategoryGroup(
  productCategory: string | undefined | null,
  filterGroup: string,
): boolean {
  if (!filterGroup || filterGroup === "all") return true;
  return resolveProductCategoryGroup(productCategory) === filterGroup;
}

export function categoryFilterLabel(value: string, allValue = "all"): string {
  if (value === allValue) return "Tất cả";
  return value;
}

export function filterProductsByCategory<T extends { category: string }>(
  items: T[],
  filterGroup: string,
  allValue = "all",
): T[] {
  if (!filterGroup || filterGroup === allValue) return items;
  return items.filter((item) => matchesProductCategoryGroup(item.category, filterGroup));
}
