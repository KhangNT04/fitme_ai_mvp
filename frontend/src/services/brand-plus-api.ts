import apiClient, { unwrap } from "./api-client";
import type {
  BrandBillingOrder,
  BrandPlusCheckoutResponse,
  BrandPlusQuote,
  BrandPlusStatus,
  BrandVoucher,
} from "@/types/billing";

export const BRAND_PLAN_QUERY_KEY = ["brand-plan"] as const;
export const BRAND_VOUCHERS_QUERY_KEY = ["brand-vouchers"] as const;
export const BRAND_PLAN_QUOTE_QUERY_KEY = ["brand-plan-quote"] as const;

export const brandPlusApi = {
  getStatus: async (): Promise<BrandPlusStatus> => {
    const res = await apiClient.get("/brand/plan");
    return unwrap(res);
  },
  /** Price preview; the larger of the running discount and the voucher applies. */
  getQuote: async (voucherId?: string | null): Promise<BrandPlusQuote> => {
    const res = await apiClient.get("/brand/plan/quote", {
      params: voucherId ? { voucherId } : undefined,
    });
    return unwrap(res);
  },
  checkout: async (voucherId?: string | null): Promise<BrandPlusCheckoutResponse> => {
    const res = await apiClient.post("/brand/plan/checkout", voucherId ? { voucherId } : {});
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
  getVouchers: async (): Promise<BrandVoucher[]> => {
    const res = await apiClient.get("/brand/vouchers");
    const data = unwrap<BrandVoucher[]>(res);
    return Array.isArray(data) ? data : [];
  },
};
