import type { Product } from "@/types/product";
import type { TryOnItem } from "@/types/tryon";

export function productToTryOnItem(product: Product): TryOnItem {
  return {
    productId: product.id,
    category: product.category,
    name: product.name,
    imageUrl: product.images[0],
  };
}
