import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mergeTryOnSelection, type TryOnAddItemResult } from "@/lib/tryon-role";
import type { TryOnItem, TryOnInput } from "@/types/tryon";

interface TryOnState {
  selectedItems: TryOnItem[];
  input: Partial<TryOnInput>;
  requestId: string | null;
  photoUploadId: string | null;
  avatarKey: string | null;
  photoPreviewUrl: string | null;
  photoQuality: "idle" | "uploading" | "checking" | "good" | "poor" | null;
  addItem: (item: TryOnItem) => TryOnAddItemResult;
  removeItem: (productId: string) => void;
  clearItems: () => void;
  setInput: (input: Partial<TryOnInput>) => void;
  setRequestId: (id: string) => void;
  setPhotoUploadId: (id: string | null) => void;
  setAvatarKey: (key: string | null) => void;
  setPhotoPreviewUrl: (url: string | null) => void;
  setPhotoQuality: (status: TryOnState["photoQuality"]) => void;
  clearPhoto: () => void;
  reset: () => void;
}

export const useTryOnStore = create<TryOnState>()(
  persist(
    (set) => ({
      selectedItems: [],
      input: {},
      requestId: null,
      photoUploadId: null,
      avatarKey: null,
      photoPreviewUrl: null,
      photoQuality: null,
      addItem: (item) => {
        let result: TryOnAddItemResult = "unchanged";
        set((s) => {
          const merged = mergeTryOnSelection(s.selectedItems, item);
          result = merged.result;
          return { selectedItems: merged.items };
        });
        return result;
      },
      removeItem: (productId) =>
        set((s) => ({
          selectedItems: s.selectedItems.filter((i) => i.productId !== productId),
        })),
      clearItems: () => set({ selectedItems: [] }),
      setInput: (input) => set((s) => ({ input: { ...s.input, ...input } })),
      setRequestId: (id) => set({ requestId: id }),
      setPhotoUploadId: (id) => set({ photoUploadId: id }),
      setAvatarKey: (key) => set({ avatarKey: key }),
      setPhotoPreviewUrl: (url) => set({ photoPreviewUrl: url }),
      setPhotoQuality: (status) => set({ photoQuality: status }),
      clearPhoto: () => set({ photoUploadId: null, photoPreviewUrl: null, photoQuality: null }),
      reset: () =>
        set({
          selectedItems: [],
          input: {},
          requestId: null,
          photoUploadId: null,
          avatarKey: null,
          photoPreviewUrl: null,
          photoQuality: null,
        }),
    }),
    {
      name: "fitme-tryon",
      skipHydration: true,
      partialize: (state) => ({
        selectedItems: state.selectedItems,
        input: state.input,
        requestId: state.requestId,
        photoUploadId: state.photoUploadId,
        avatarKey: state.avatarKey,
        photoQuality: state.photoQuality,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.photoPreviewUrl?.startsWith("blob:")) {
          state.photoPreviewUrl = null;
        }
      },
    }
  )
);
