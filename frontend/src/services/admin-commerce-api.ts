import apiClient, { unwrap } from "./api-client";
import type { CommerceSummary, OrderDetail, OrderSummary, SellerSettlement } from "@/types/commerce";

export const adminCommerceApi = {
  listOrders: async (status?: string): Promise<OrderSummary[]> => {
    const res = await apiClient.get("/admin/orders", { params: status ? { status } : undefined });
    return unwrap(res);
  },
  getOrder: async (id: string): Promise<OrderDetail> => {
    const res = await apiClient.get(`/admin/orders/${id}`);
    return unwrap(res);
  },
  getSummary: async (): Promise<CommerceSummary> => {
    const res = await apiClient.get("/admin/commerce/summary");
    return unwrap(res);
  },
  listSettlements: async (filters?: { status?: string; brandId?: string }): Promise<SellerSettlement[]> => {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.brandId) params.brandId = filters.brandId;
    const res = await apiClient.get("/admin/settlements", { params });
    return unwrap(res);
  },
  /** Creates one settlement per brand with eligible delivered orders (optionally a single brand). */
  generateSettlements: async (brandId?: string): Promise<SellerSettlement[]> => {
    const res = await apiClient.post("/admin/settlements/generate", brandId ? { brandId } : {});
    return unwrap(res);
  },
  markSettlementPaid: async (id: string, payoutRef: string): Promise<SellerSettlement> => {
    const res = await apiClient.post(`/admin/settlements/${id}/mark-paid`, { payoutRef });
    return unwrap(res);
  },
};
