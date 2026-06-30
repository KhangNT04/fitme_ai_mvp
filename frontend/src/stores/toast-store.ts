import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  items: ToastItem[];
  push: (item: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: ({ type, message }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set({ items: [...get().items, { id, type, message }] });
    window.setTimeout(() => get().dismiss(id), 4500);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push({ type: "success", message }),
  error: (message: string) => useToastStore.getState().push({ type: "error", message }),
  info: (message: string) => useToastStore.getState().push({ type: "info", message }),
};
