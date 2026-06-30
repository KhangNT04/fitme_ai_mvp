import { PLACEHOLDER_PRODUCT } from "@/lib/media-url";
import { productDetailFromAiResultHref } from "@/lib/nav-context";
import type { OutfitItem } from "@/types/outfit";
import type { Product } from "@/types/product";

export function outfitItemDetailHref(item: OutfitItem, recommendationId?: string): string {
  if (item.fromWardrobe) return "/wardrobe";
  if (item.productId) {
    return recommendationId
      ? productDetailFromAiResultHref(item.productId, recommendationId)
      : `/products/${item.productId}`;
  }
  return "/discover";
}
/** Map recommendation outfit items to catalog ProductCard shape. */
export function outfitItemToProduct(item: OutfitItem): Product {
  const id = item.productId || item.wardrobeItemId || item.id;
  return {
    id,
    brandId: "",
    brandName: item.fromWardrobe ? "Tủ đồ của bạn" : "Gợi ý outfit",
    name: item.name,
    category: item.category,
    price: item.price ?? 0,
    images: item.imageUrl ? [item.imageUrl] : [PLACEHOLDER_PRODUCT],
    colors: item.color ? [item.color] : [],
    sizes: item.size ? [item.size] : [],
    fitType: "REGULAR",
    styleTags: [],
    occasionTags: [],
    purchaseUrl: item.productId ? `/redirect/confirm/${item.productId}` : "",
    stockStatus: "IN_STOCK",
    status: "ACTIVE",
    aiTryOnEligible: !item.fromWardrobe && !!item.productId,
  };
}

export function outfitItemShowPrice(item: OutfitItem): boolean {
  return !item.fromWardrobe && item.price != null && item.price > 0;
}
