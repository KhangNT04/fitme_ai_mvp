import apiClient, { unwrap } from "./api-client";
import type { Brand } from "@/types/brand";
import type {
  AdminBrandBillingDetail,
  AdminBrandBillingListItem,
  BillingPlan,
  BrandBillingSummary,
  CheckoutResponse,
} from "@/types/billing";

function toBrandBillingListItem(brand: Brand): AdminBrandBillingListItem {
  return {
    id: brand.id,
    name: brand.name,
    contactEmail: brand.contactEmail ?? null,
    status: brand.status,
    createdAt: brand.createdAt,
    totalQuotaRemaining: brand.totalQuotaRemaining ?? 0,
    activePlanName: brand.activePlanName ?? null,
    dashboardEnabled: brand.dashboardEnabled ?? false,
  };
}

function toAdminBrandBillingDetail(
  summary: BrandBillingSummary,
  brand?: Brand,
): AdminBrandBillingDetail {
  const billingActive =
    summary.totalRemaining > 0 || summary.subscription?.status === "ACTIVE";
  return {
    ...summary,
    brandName: brand?.name ?? "Brand",
    contactEmail: brand?.contactEmail ?? null,
    brandStatus: brand?.status ?? "UNKNOWN",
    billingActive,
  };
}

async function fetchAdminBrands(): Promise<Brand[]> {
  const res = await apiClient.get("/admin/brands");
  return unwrap(res);
}

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
  listBrandBilling: async (): Promise<AdminBrandBillingListItem[]> => {
    try {
      const res = await apiClient.get("/admin/billing/brands");
      return unwrap(res);
    } catch {
      const brands = await fetchAdminBrands();
      return brands.map(toBrandBillingListItem);
    }
  },
  getBrandBilling: async (brandId: string): Promise<AdminBrandBillingDetail> => {
    const brands = await fetchAdminBrands();
    const brand = brands.find((item) => item.id === brandId);
    if (!brand) throw new Error("Thương hiệu không tồn tại");

    const res = await apiClient.get(`/admin/billing/brands/${brandId}`);
    const data = unwrap(res) as AdminBrandBillingDetail & BrandBillingSummary;
    if (data.brandName) return data;
    return toAdminBrandBillingDetail(data, brand);
  },
  adjustQuota: async (
    brandId: string,
    data: { subscriptionDelta: number; topupDelta: number; note?: string }
  ): Promise<AdminBrandBillingDetail> => {
    const res = await apiClient.post(`/admin/billing/brands/${brandId}/adjust`, data);
    const payload = unwrap(res) as AdminBrandBillingDetail & BrandBillingSummary;
    if (payload.brandName) return payload;
    const brand = (await fetchAdminBrands()).find((item) => item.id === brandId);
    return toAdminBrandBillingDetail(payload, brand);
  },
  deactivateBrandBilling: async (
    brandId: string,
    note?: string
  ): Promise<AdminBrandBillingDetail> => {
    const res = await apiClient.post(`/admin/billing/brands/${brandId}/deactivate`, { note });
    const payload = unwrap(res) as AdminBrandBillingDetail & BrandBillingSummary;
    if (payload.brandName) return payload;
    const brand = (await fetchAdminBrands()).find((item) => item.id === brandId);
    return toAdminBrandBillingDetail(payload, brand);
  },
};
