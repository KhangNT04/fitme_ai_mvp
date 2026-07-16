import type { OutfitItem } from "@/types/outfit";
import type { TryOnItem } from "@/types/tryon";
import { useTryOnStore } from "@/stores/tryon-store";

export function outfitItemToTryOnItem(item: OutfitItem): TryOnItem | null {
  if (!item.productId || item.fromWardrobe) return null;
  return {
    productId: item.productId,
    category: item.category,
    name: item.name,
    imageUrl: item.imageUrl,
  };
}

/** Clears try-on selection and seeds brand products from a recommendation outfit. */
export function seedTryOnFromOutfitItems(items: OutfitItem[]): number {
  const tryOnItems = items
    .map(outfitItemToTryOnItem)
    .filter((item): item is TryOnItem => item != null);

  const store = useTryOnStore.getState();
  store.clearItems();
  for (const item of tryOnItems) {
    store.addItem(item);
  }
  return tryOnItems.length;
}
