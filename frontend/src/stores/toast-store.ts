import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const DEFAULT_DURATION_MS = 4500;

interface ToastState {
  items: ToastItem[];
  push: (item: Omit<ToastItem, "id">, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: ({ type, message }, durationMs = DEFAULT_DURATION_MS) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set({ items: [...get().items, { id, type, message }] });
    window.setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().push({ type: "success", message }, durationMs),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().push({ type: "error", message }, durationMs),
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().push({ type: "info", message }, durationMs),
};
