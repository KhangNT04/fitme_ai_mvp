import apiClient, { unwrap } from "./api-client";
import type {
  PayoutAccount,
  SalesSummary,
  SellerOrderDetail,
  SellerOrderSummary,
  SellerSettlement,
  SellerSettlementSummary,
  Shipment,
  ShipmentEventRequest,
  ShipOrderRequest,
} from "@/types/commerce";

export const sellerOrderApi = {
  list: async (status?: string): Promise<SellerOrderSummary[]> => {
    const res = await apiClient.get("/brand/orders", { params: status ? { status } : undefined });
    return unwrap(res);
  },
  get: async (sellerOrderId: string): Promise<SellerOrderDetail> => {
    const res = await apiClient.get(`/brand/orders/${sellerOrderId}`);
    return unwrap(res);
  },
  confirm: async (id: string): Promise<SellerOrderDetail> => {
    const res = await apiClient.post(`/brand/orders/${id}/confirm`);
    return unwrap(res);
  },
  pack: async (id: string): Promise<SellerOrderDetail> => {
    const res = await apiClient.post(`/brand/orders/${id}/pack`);
    return unwrap(res);
  },
  cancel: async (id: string, reason: string): Promise<SellerOrderDetail> => {
    const res = await apiClient.post(`/brand/orders/${id}/cancel`, { reason });
    return unwrap(res);
  },
  ship: async (id: string, payload: ShipOrderRequest): Promise<Shipment> => {
    const body: ShipOrderRequest = { carrier: payload.carrier };
    if (payload.trackingCode?.trim()) body.trackingCode = payload.trackingCode.trim();
    const res = await apiClient.post(`/brand/orders/${id}/ship`, body);
    return unwrap(res);
  },
  addShipmentEvent: async (shipmentId: string, payload: ShipmentEventRequest): Promise<Shipment> => {
    const res = await apiClient.post(`/brand/shipments/${shipmentId}/events`, payload);
    return unwrap(res);
  },
  getSettlements: async (): Promise<SellerSettlement[]> => {
    const res = await apiClient.get("/brand/settlements");
    return unwrap(res);
  },
  getSettlementSummary: async (): Promise<SellerSettlementSummary> => {
    const res = await apiClient.get("/brand/settlements/summary");
    return unwrap(res);
  },
  getPayoutAccount: async (): Promise<PayoutAccount> => {
    const res = await apiClient.get("/brand/payout-account");
    return unwrap(res);
  },
  updatePayoutAccount: async (payload: PayoutAccount): Promise<PayoutAccount> => {
    const res = await apiClient.put("/brand/payout-account", payload);
    return unwrap(res);
  },
  getSalesSummary: async (): Promise<SalesSummary> => {
    const res = await apiClient.get("/brand/sales/summary");
    return unwrap(res);
  },
};
