import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TryOnItem, TryOnInput } from "@/types/tryon";

interface TryOnState {
  selectedItems: TryOnItem[];
  input: Partial<TryOnInput>;
  requestId: string | null;
  addItem: (item: TryOnItem) => void;
  removeItem: (productId: string) => void;
  clearItems: () => void;
  setInput: (input: Partial<TryOnInput>) => void;
  setRequestId: (id: string) => void;
  reset: () => void;
}

export const useTryOnStore = create<TryOnState>()(
  persist(
    (set) => ({
      selectedItems: [],
      input: {},
      requestId: null,
      addItem: (item) =>
        set((s) => ({
          selectedItems: s.selectedItems.some((i) => i.productId === item.productId)
            ? s.selectedItems
            : [...s.selectedItems, item],
        })),
      removeItem: (productId) =>
        set((s) => ({
          selectedItems: s.selectedItems.filter((i) => i.productId !== productId),
        })),
      clearItems: () => set({ selectedItems: [] }),
      setInput: (input) => set((s) => ({ input: { ...s.input, ...input } })),
      setRequestId: (id) => set({ requestId: id }),
      reset: () => set({ selectedItems: [], input: {}, requestId: null }),
    }),
    { name: "fitme-tryon", skipHydration: true }
  )
);
