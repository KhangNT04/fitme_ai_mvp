import apiClient, { unwrap } from "./api-client";
import type { BillingPlan, BrandBillingSummary, CheckoutResponse } from "@/types/billing";

export const billingApi = {
  getSummary: async (): Promise<BrandBillingSummary> => {
    const res = await apiClient.get("/brand/billing/summary");
    return unwrap(res);
  },
  getPlans: async (): Promise<BillingPlan[]> => {
    const res = await apiClient.get("/brand/billing/plans");
    return unwrap(res);
  },
  checkout: async (planId: string): Promise<CheckoutResponse> => {
    const res = await apiClient.post("/brand/billing/checkout", { planId });
    return unwrap(res);
  },
};

export const adminBillingApi = {
  getPlans: async (): Promise<BillingPlan[]> => {
    const res = await apiClient.get("/admin/billing/plans");
    return unwrap(res);
  },
  createPlan: async (data: Omit<BillingPlan, "id">): Promise<BillingPlan> => {
    const res = await apiClient.post("/admin/billing/plans", data);
    return unwrap(res);
  },
  updatePlan: async (id: string, data: Omit<BillingPlan, "id">): Promise<BillingPlan> => {
    const res = await apiClient.put(`/admin/billing/plans/${id}`, data);
    return unwrap(res);
  },
  deletePlan: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/billing/plans/${id}`);
  },
  getBrandBilling: async (brandId: string): Promise<BrandBillingSummary> => {
    const res = await apiClient.get(`/admin/billing/brands/${brandId}`);
    return unwrap(res);
  },
  adjustQuota: async (
    brandId: string,
    data: { subscriptionDelta: number; topupDelta: number; note?: string }
  ): Promise<BrandBillingSummary> => {
    const res = await apiClient.post(`/admin/billing/brands/${brandId}/adjust`, data);
    return unwrap(res);
  },
};
