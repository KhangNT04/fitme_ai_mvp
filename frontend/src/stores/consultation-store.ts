import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConsultationDraft } from "@/types/session";
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
        set((s) => ({ draft: { ...s.draft, sessionId } })),
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
      reset: () => set({ draft: initialDraft }),
    }),
    { name: "fitme-consultation" }
  )
);
