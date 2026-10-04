import apiClient, { unwrap } from "./api-client";
import type { BillingPlan, BillingPlanWrite } from "@/types/billing";

export const adminBillingApi = {
  getPlans: async (): Promise<BillingPlan[]> => {
    const res = await apiClient.get("/admin/billing/plans");
    return unwrap(res);
  },
  getPlan: async (id: string): Promise<BillingPlan> => {
    try {
      const res = await apiClient.get(`/admin/billing/plans/${id}`);
      return unwrap(res);
    } catch {
      const plans = await adminBillingApi.getPlans();
      const plan = plans.find((item) => item.id === id);
      if (!plan) throw new Error("Gói không tồn tại");
      return plan;
    }
  },
  createPlan: async (data: BillingPlanWrite): Promise<BillingPlan> => {
    const res = await apiClient.post("/admin/billing/plans", data);
    return unwrap(res);
  },
  updatePlan: async (id: string, data: BillingPlanWrite): Promise<BillingPlan> => {
    const res = await apiClient.put(`/admin/billing/plans/${id}`, data);
    return unwrap(res);
  },
  deletePlan: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/billing/plans/${id}`);
  },
};
