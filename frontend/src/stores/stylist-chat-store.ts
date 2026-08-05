import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isTtlExpired, THIRTY_DAYS_MS } from "@/lib/ttl-storage";
import type { RecommendationResult } from "@/types/outfit";
import type { StylistChatMessage } from "@/types/stylist-chat";

interface StylistChatState {
  messages: StylistChatMessage[];
  conversationId: string | null;
  /** Pinned starter boards (Đi làm / Đi chơi / Thể thao) shown above chat. */
  starterRecommendations: RecommendationResult[];
  savedAt: number;
  addMessage: (message: StylistChatMessage) => void;
  setMessages: (messages: StylistChatMessage[]) => void;
  setConversationId: (id: string | null) => void;
  setStarterRecommendations: (recommendations: RecommendationResult[]) => void;
  clearChat: () => void;
}

function pruneExpired(state: {
  messages: StylistChatMessage[];
  starterRecommendations: RecommendationResult[];
  savedAt: number;
}) {
  if (state.savedAt && isTtlExpired(state.savedAt, THIRTY_DAYS_MS)) {
    return {
      messages: [] as StylistChatMessage[],
      conversationId: null as string | null,
      starterRecommendations: [] as RecommendationResult[],
      savedAt: Date.now(),
    };
  }
  return null;
}

export const useStylistChatStore = create<StylistChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      conversationId: null,
      starterRecommendations: [],
      savedAt: Date.now(),
      addMessage: (message) => {
        const pruned = pruneExpired(get());
        if (pruned) {
          set({ ...pruned, messages: [message], savedAt: Date.now() });
          return;
        }
        set((s) => ({
          messages: [...s.messages, message],
          savedAt: Date.now(),
        }));
      },
      setMessages: (messages) => set({ messages, savedAt: Date.now() }),
      setConversationId: (id) => set({ conversationId: id, savedAt: Date.now() }),
      setStarterRecommendations: (recommendations) =>
        set({ starterRecommendations: recommendations, savedAt: Date.now() }),
      clearChat: () =>
        set({
          messages: [],
          conversationId: null,
          starterRecommendations: [],
          savedAt: Date.now(),
        }),
    }),
    {
      name: "fitme-stylist-chat",
      skipHydration: true,
      partialize: (state) => ({
        messages: state.messages,
        conversationId: state.conversationId,
        starterRecommendations: state.starterRecommendations,
        savedAt: state.savedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.savedAt && isTtlExpired(state.savedAt, THIRTY_DAYS_MS)) {
          state.messages = [];
          state.conversationId = null;
          state.starterRecommendations = [];
          state.savedAt = Date.now();
        }
        if (!state.starterRecommendations) {
          state.starterRecommendations = [];
        }
      },
    },
  ),
);
