import apiClient, { unwrap } from "./api-client";
import type { BrandBillingOrder, BrandPlusCheckoutResponse, BrandPlusStatus } from "@/types/billing";

export const BRAND_PLAN_QUERY_KEY = ["brand-plan"] as const;

export const brandPlusApi = {
  getStatus: async (): Promise<BrandPlusStatus> => {
    const res = await apiClient.get("/brand/plan");
    return unwrap(res);
  },
  checkout: async (): Promise<BrandPlusCheckoutResponse> => {
    const res = await apiClient.post("/brand/plan/checkout");
    return unwrap(res);
  },
  /** Return-page polling; with mock PayOS this also confirms a pending order. */
  getOrder: async (orderCode: number): Promise<BrandBillingOrder> => {
    const res = await apiClient.get(`/brand/plan/orders/${orderCode}`);
    return unwrap(res);
  },
  cancelOrder: async (orderCode: number): Promise<BrandBillingOrder> => {
    const res = await apiClient.post(`/brand/plan/orders/${orderCode}/cancel`);
    return unwrap(res);
  },
};
