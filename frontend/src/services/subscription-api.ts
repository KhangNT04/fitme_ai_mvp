import apiClient, { unwrap } from "./api-client";
import type { BillingPlan } from "@/types/billing";

export interface SubscriptionCheckoutResponse {
  orderId: string;
  payosOrderCode: number;
  checkoutUrl: string;
  mockPaid: boolean;
}

export const subscriptionApi = {
  getPlans: async (): Promise<BillingPlan[]> => {
    const res = await apiClient.get("/plans");
    return unwrap(res);
  },
  checkout: async (planId: string): Promise<SubscriptionCheckoutResponse> => {
    const res = await apiClient.post("/me/subscription/checkout", { planId });
    return unwrap(res);
  },
  return: async (orderCode: number): Promise<void> => {
    const res = await apiClient.post("/me/subscription/return", { orderCode });
    return unwrap(res);
  },
};
