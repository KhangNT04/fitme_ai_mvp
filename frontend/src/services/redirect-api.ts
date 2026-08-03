import apiClient, { unwrap } from "./api-client";
import type { BuyClickRequest, BuyClickResponse, RedirectEvent } from "@/types/redirect";

export interface PurchaseHistoryItem {
  eventId: string;
  productId: string;
  productName: string;
  brandName?: string | null;
  price?: number | null;
  currency?: string;
  purchaseUrl: string;
  channel?: string;
  selectedSize?: string;
  selectedColor?: string;
  purchasedConfirmed: boolean;
  purchasedConfirmedAt?: string | null;
  clickedAt?: string;
}

export interface PurchaseHistory {
  clickCount: number;
  purchasedCount: number;
  estimatedSpend: number;
  items: PurchaseHistoryItem[];
}

export const redirectApi = {
  trackBuyClick: async (data: BuyClickRequest): Promise<BuyClickResponse> => {
    const res = await apiClient.post("/redirects/buy-click", data);
    return unwrap(res);
  },
  getEvent: async (eventId: string): Promise<RedirectEvent> => {
    const res = await apiClient.get(`/redirects/${eventId}`);
    return unwrap(res);
  },
  getHistory: async (): Promise<PurchaseHistory> => {
    const res = await apiClient.get("/redirects/history");
    const data = unwrap(res) as PurchaseHistory;
    return {
      clickCount: data.clickCount ?? 0,
      purchasedCount: data.purchasedCount ?? 0,
      estimatedSpend: Number(data.estimatedSpend ?? 0),
      items: Array.isArray(data.items) ? data.items : [],
    };
  },
  confirmPurchased: async (eventId: string, purchased = true): Promise<PurchaseHistoryItem> => {
    const res = await apiClient.post(`/redirects/${eventId}/purchased`, { purchased });
    return unwrap(res);
  },
};
