import type { OutfitItem } from "@/types/outfit";
import type { Product } from "@/types/product";
import type { WardrobeItem } from "@/types/user";

export function outfitItemKey(item: Pick<OutfitItem, "id" | "productId" | "wardrobeItemId">): string {
  return item.productId || item.wardrobeItemId || item.id;
}

export function isSameOutfitItem(a: OutfitItem, b: OutfitItem): boolean {
  return outfitItemKey(a) === outfitItemKey(b);
}

export function productToOutfitItem(product: Product): OutfitItem {
  return {
    id: product.id,
    productId: product.id,
    name: product.name,
    category: product.category,
    color: product.colors[0] || "",
    size: product.sizes[0],
    price: product.price,
    imageUrl: product.images[0],
    fromWardrobe: false,
    purchaseUrl: product.purchaseUrl,
  };
}

export function wardrobeToOutfitItem(item: WardrobeItem): OutfitItem {
  return {
    id: item.id,
    wardrobeItemId: item.id,
    name: item.itemType,
    category: item.category,
    color: item.color,
    imageUrl: item.imageUrl,
    fromWardrobe: true,
  };
}

export function hasOutfitItem(
  items: OutfitItem[],
  candidate: Pick<OutfitItem, "id" | "productId" | "wardrobeItemId">,
): boolean {
  const key = outfitItemKey(candidate);
  return items.some((item) => outfitItemKey(item) === key);
}
