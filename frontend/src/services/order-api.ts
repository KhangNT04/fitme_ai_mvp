import apiClient, { unwrap } from "./api-client";
import type {
  OrderDetail,
  OrderPreview,
  OrderPreviewRequest,
  OrderSummary,
  PayOrderResult,
  PlaceOrderRequest,
  PlaceOrderResult,
  TrackingEntry,
  UserVoucher,
} from "@/types/commerce";

export const ORDERS_QUERY_KEY = ["orders"] as const;

export const orderApi = {
  preview: async (payload: OrderPreviewRequest): Promise<OrderPreview> => {
    const res = await apiClient.post("/orders/preview", payload);
    return unwrap(res);
  },
  place: async (payload: PlaceOrderRequest): Promise<PlaceOrderResult> => {
    const res = await apiClient.post("/orders", payload);
    return unwrap(res);
  },
  list: async (status?: string): Promise<OrderSummary[]> => {
    const res = await apiClient.get("/orders", { params: status ? { status } : undefined });
    return unwrap(res);
  },
  get: async (id: string): Promise<OrderDetail> => {
    const res = await apiClient.get(`/orders/${id}`);
    return unwrap(res);
  },
  cancel: async (id: string, reason: string): Promise<OrderDetail> => {
    const res = await apiClient.post(`/orders/${id}/cancel`, { reason });
    return unwrap(res);
  },
  /** Re-create the PayOS link for a PENDING_PAYMENT order. */
  pay: async (id: string): Promise<PayOrderResult> => {
    const res = await apiClient.post(`/orders/${id}/pay`);
    return unwrap(res);
  },
  /** Confirm return from PayOS (mock marks the order as paid). */
  payosReturn: async (orderCode: number): Promise<OrderDetail> => {
    const res = await apiClient.post("/orders/payos/return", { orderCode });
    return unwrap(res);
  },
  tracking: async (id: string): Promise<TrackingEntry[]> => {
    const res = await apiClient.get(`/orders/${id}/tracking`);
    return unwrap(res);
  },
  /** Available FREESHIP vouchers the user can apply at checkout. */
  listFreeshipVouchers: async (): Promise<UserVoucher[]> => {
    const res = await apiClient.get("/me/vouchers");
    const all = (unwrap(res) as UserVoucher[]) ?? [];
    const now = Date.now();
    return all.filter(
      (v) =>
        v.status === "AVAILABLE" &&
        v.voucherType === "FREESHIP" &&
        (!v.expiresAt || new Date(v.expiresAt).getTime() > now),
    );
  },
};
