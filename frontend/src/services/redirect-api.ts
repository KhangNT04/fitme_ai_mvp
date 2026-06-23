import apiClient, { unwrap } from "./api-client";
import type { BuyClickRequest, BuyClickResponse, RedirectEvent } from "@/types/redirect";

export const redirectApi = {
  trackBuyClick: async (data: BuyClickRequest): Promise<BuyClickResponse> => {
    const res = await apiClient.post("/redirects/buy-click", data);
    return unwrap(res);
  },
  getEvent: async (eventId: string): Promise<RedirectEvent> => {
    const res = await apiClient.get(`/redirects/${eventId}`);
    return unwrap(res);
  },
};
