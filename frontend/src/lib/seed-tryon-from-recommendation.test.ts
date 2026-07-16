import { describe, expect, it, beforeEach, vi } from "vitest";
import type { OutfitItem } from "@/types/outfit";

const clearItems = vi.fn();
const addItem = vi.fn(() => "added");

vi.mock("@/stores/tryon-store", () => ({
  useTryOnStore: {
    getState: () => ({
      clearItems,
      addItem,
    }),
  },
}));

import {
  outfitItemToTryOnItem,
  seedTryOnFromOutfitItems,
} from "@/lib/seed-tryon-from-recommendation";

describe("seedTryOnFromOutfitItems", () => {
  beforeEach(() => {
    clearItems.mockClear();
    addItem.mockClear();
  });

  it("maps brand items and skips wardrobe", () => {
    const items: OutfitItem[] = [
      {
        id: "1",
        productId: "p1",
        name: "Áo",
        category: "Áo",
        color: "Đen",
        fromWardrobe: false,
        imageUrl: "/a.jpg",
      },
      {
        id: "2",
        wardrobeItemId: "w1",
        name: "Quần cũ",
        category: "Quần",
        color: "Xám",
        fromWardrobe: true,
      },
      {
        id: "3",
        name: "No product",
        category: "Giày",
        color: "Trắng",
        fromWardrobe: false,
      },
    ];

    expect(outfitItemToTryOnItem(items[0])).toEqual({
      productId: "p1",
      category: "Áo",
      name: "Áo",
      imageUrl: "/a.jpg",
    });
    expect(outfitItemToTryOnItem(items[1])).toBeNull();

    const count = seedTryOnFromOutfitItems(items);
    expect(clearItems).toHaveBeenCalledOnce();
    expect(addItem).toHaveBeenCalledOnce();
    expect(count).toBe(1);
  });
});
