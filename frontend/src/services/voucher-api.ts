import apiClient, { unwrap } from "./api-client";
import type {
  AdminBrandVoucher,
  IssueVouchersResult,
  VoucherCampaign,
  VoucherCampaignWrite,
} from "@/types/billing";

export const VOUCHER_CAMPAIGNS_QUERY_KEY = ["admin-voucher-campaigns"] as const;

export const adminVoucherApi = {
  getCampaigns: async (): Promise<VoucherCampaign[]> => {
    const res = await apiClient.get("/admin/voucher-campaigns");
    const data = unwrap<VoucherCampaign[]>(res);
    return Array.isArray(data) ? data : [];
  },
  getCampaign: async (id: string): Promise<VoucherCampaign> => {
    const res = await apiClient.get(`/admin/voucher-campaigns/${id}`);
    return unwrap(res);
  },
  createCampaign: async (data: VoucherCampaignWrite): Promise<VoucherCampaign> => {
    const res = await apiClient.post("/admin/voucher-campaigns", data);
    return unwrap(res);
  },
  updateCampaign: async (id: string, data: VoucherCampaignWrite): Promise<VoucherCampaign> => {
    const res = await apiClient.put(`/admin/voucher-campaigns/${id}`, data);
    return unwrap(res);
  },
  issue: async (id: string, brandIds: string[]): Promise<IssueVouchersResult> => {
    const res = await apiClient.post(`/admin/voucher-campaigns/${id}/issue`, { brandIds });
    return unwrap(res);
  },
  getVouchers: async (id: string): Promise<AdminBrandVoucher[]> => {
    const res = await apiClient.get(`/admin/voucher-campaigns/${id}/vouchers`);
    const data = unwrap<AdminBrandVoucher[]>(res);
    return Array.isArray(data) ? data : [];
  },
  revoke: async (voucherId: string): Promise<AdminBrandVoucher> => {
    const res = await apiClient.post(`/admin/brand-vouchers/${voucherId}/revoke`);
    return unwrap(res);
  },
};
