import apiClient, { unwrap } from "./api-client";
import { leadQueryParams } from "@/lib/brand-leads";
import type { BrandLead, BrandLeadFilters, BrandLeadPage } from "@/types/brand-lead";

export const BRAND_LEADS_QUERY_KEY = ["brand-leads"] as const;

export const brandLeadApi = {
  /** Brand Plus gets rows; other brands get only the summary with `plusRequired: true`. */
  list: async (filters: BrandLeadFilters): Promise<BrandLeadPage> => {
    const res = await apiClient.get("/brand/leads", { params: leadQueryParams(filters) });
    const data = unwrap<BrandLeadPage>(res);
    return { ...data, items: Array.isArray(data.items) ? data.items : [] };
  },
  markSold: async (leadId: string, sold: boolean): Promise<BrandLead> => {
    const res = await apiClient.patch(`/brand/leads/${leadId}/sold`, { sold });
    return unwrap(res);
  },
};
