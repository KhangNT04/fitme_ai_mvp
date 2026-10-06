import apiClient, { unwrap } from "./api-client";
import type {
  AdminBrandSubscription,
  BillingPlan,
  BillingPlanWrite,
  PlanAudience,
} from "@/types/billing";

export const adminBillingApi = {
  getPlans: async (audience?: PlanAudience): Promise<BillingPlan[]> => {
    const res = await apiClient.get("/admin/billing/plans", {
      params: audience ? { audience } : undefined,
    });
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
  getBrandSubscriptions: async (): Promise<AdminBrandSubscription[]> => {
    const res = await apiClient.get("/admin/brand-subscriptions");
    const data = unwrap<AdminBrandSubscription[]>(res);
    return Array.isArray(data) ? data : [];
  },
};
