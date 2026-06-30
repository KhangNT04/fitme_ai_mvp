import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hasOutfitItem, outfitItemKey } from "@/lib/outfit-item-utils";
import type { ConsultationDraft } from "@/types/session";
import type { OutfitItem } from "@/types/outfit";
import type { BodyProfile, StyleProfile, OccasionRequest, WardrobeMode } from "@/types/user";

interface ConsultationState {
  draft: ConsultationDraft;
  setSessionId: (sessionId: string) => void;
  setSelectedProductId: (productId: string) => void;
  setBodyProfile: (profile: BodyProfile) => void;
  setStyleProfile: (profile: StyleProfile) => void;
  setOccasionRequest: (request: OccasionRequest) => void;
  setWardrobeMode: (mode: WardrobeMode) => void;
  setPhotoUploadId: (id: string) => void;
  setRecommendationId: (id: string) => void;
  initPreviewOutfit: (recommendationId: string, items: OutfitItem[]) => void;
  addPreviewOutfitItem: (item: OutfitItem) => void;
  removePreviewOutfitItem: (key: string) => void;
  reset: () => void;
}

const initialDraft: ConsultationDraft = {
  sessionId: "",
  wardrobeMode: "MIX_WARDROBE_AND_BRAND",
};

export const useConsultationStore = create<ConsultationState>()(
  persist(
    (set) => ({
      draft: initialDraft,
      setSessionId: (sessionId) =>
        set((s) =>
          s.draft.sessionId === sessionId
            ? s
            : { draft: { ...s.draft, sessionId } }
        ),
      setSelectedProductId: (productId) =>
        set((s) => ({ draft: { ...s.draft, selectedProductId: productId } })),
      setBodyProfile: (profile) =>
        set((s) => ({ draft: { ...s.draft, bodyProfile: profile } })),
      setStyleProfile: (profile) =>
        set((s) => ({ draft: { ...s.draft, styleProfile: profile } })),
      setOccasionRequest: (request) =>
        set((s) => ({ draft: { ...s.draft, occasionRequest: request } })),
      setWardrobeMode: (mode) =>
        set((s) => ({ draft: { ...s.draft, wardrobeMode: mode } })),
      setPhotoUploadId: (id) =>
        set((s) => ({ draft: { ...s.draft, photoUploadId: id } })),
      setRecommendationId: (id) =>
        set((s) => ({ draft: { ...s.draft, recommendationId: id } })),
      initPreviewOutfit: (recommendationId, items) =>
        set((s) => {
          const keepExisting =
            s.draft.previewOutfitSourceId === recommendationId &&
            (s.draft.previewOutfitItems?.length ?? 0) > 0;
          if (keepExisting) {
            return { draft: { ...s.draft, recommendationId } };
          }
          return {
            draft: {
              ...s.draft,
              recommendationId,
              previewOutfitSourceId: recommendationId,
              previewOutfitItems: items,
            },
          };
        }),
      addPreviewOutfitItem: (item) =>
        set((s) => {
          const current = s.draft.previewOutfitItems ?? [];
          if (hasOutfitItem(current, item)) return s;
          return {
            draft: {
              ...s.draft,
              previewOutfitItems: [...current, item],
            },
          };
        }),
      removePreviewOutfitItem: (key) =>
        set((s) => ({
          draft: {
            ...s.draft,
            previewOutfitItems: (s.draft.previewOutfitItems ?? []).filter(
              (item) => outfitItemKey(item) !== key,
            ),
          },
        })),
      reset: () => set({ draft: initialDraft }),
    }),
    { name: "fitme-consultation", skipHydration: true }
  )
);
