import apiClient, { unwrap } from "./api-client";
import type { AddCartItemRequest, Cart } from "@/types/commerce";

/** React Query key shared with the header cart badge. */
export const CART_QUERY_KEY = ["cart"] as const;

export const cartApi = {
  get: async (): Promise<Cart> => {
    const res = await apiClient.get("/cart");
    return unwrap(res);
  },
  addItem: async (payload: AddCartItemRequest): Promise<Cart> => {
    const res = await apiClient.post("/cart/items", payload);
    return unwrap(res);
  },
  /** quantity 0 removes the line. */
  updateItem: async (itemId: string, quantity: number): Promise<Cart> => {
    const res = await apiClient.patch(`/cart/items/${itemId}`, { quantity });
    return unwrap(res);
  },
  removeItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/cart/items/${itemId}`);
  },
  clear: async (): Promise<void> => {
    await apiClient.delete("/cart");
  },
};
