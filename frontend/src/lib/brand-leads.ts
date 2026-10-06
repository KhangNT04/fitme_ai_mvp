import type { CustomerFunnel } from "@/types/analytics";
import type { BrandLead, BrandLeadFilters, BrandLeadPage } from "@/types/brand-lead";

export const LEAD_SHARING_CONSENT_TEXT =
  "Chia sẻ tên và email với brand khi bạn bấm mua, để brand liên hệ tư vấn và xác nhận đơn";

export const LEADS_PAGE_SIZE = 20;

export const DEFAULT_LEAD_FILTERS: BrandLeadFilters = { from: "", to: "", productId: "", sold: "all", page: 0 };

/** Query params for GET /brand/leads; empty filters are left out. */
export function leadQueryParams(
  filters: BrandLeadFilters,
  size: number = LEADS_PAGE_SIZE,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = { page: Math.max(0, filters.page), size };
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.productId) params.productId = filters.productId;
  if (filters.sold !== "all") params.sold = filters.sold === "sold";
  return params;
}

/** Inline validation message for the date range, or null when it is usable. */
export function leadDateRangeError(from: string, to: string): string | null {
  return from && to && from > to ? "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." : null;
}

/** What the brand may see about the customer behind a lead. */
export function leadCustomer(lead: BrandLead): { name: string; email: string | null; hidden: boolean } {
  if (lead.customerStatus === "WITHDRAWN") return { name: "Khách đã rút đồng ý", email: null, hidden: true };
  if (lead.customerStatus === "ANONYMIZED") return { name: "Khách đã xóa tài khoản", email: null, hidden: true };
  return { name: lead.customerName?.trim() || "Khách hàng FitMe", email: lead.customerEmail ?? null, hidden: false };
}

/** "M · Đen", "M", "Đen" or "—". */
export function leadVariantLabel(lead: Pick<BrandLead, "size" | "color">): string {
  const parts = [lead.size, lead.color].map((part) => part?.trim()).filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

/** Optimistic "Đã bán" toggle: updates the row and the brand-wide sold count. */
export function withLeadSold(page: BrandLeadPage, leadId: string, soldAt: string | null): BrandLeadPage {
  let delta = 0;
  const items = page.items.map((lead) => {
    if (lead.id !== leadId) return lead;
    const wasSold = !!lead.confirmedSoldAt;
    const nowSold = !!soldAt;
    if (wasSold !== nowSold) delta = nowSold ? 1 : -1;
    return { ...lead, confirmedSoldAt: nowSold ? (lead.confirmedSoldAt ?? soldAt) : null };
  });
  return { ...page, items, summary: { ...page.summary, sold: Math.max(0, page.summary.sold + delta) } };
}

export interface FunnelStep {
  label: string;
  value: number;
  /** Share of the previous step (0..1); null for the first step or when the previous step is 0. */
  rate: number | null;
}

export function funnelSteps(funnel: CustomerFunnel | null | undefined): FunnelStep[] {
  const values = [
    { label: "Khách thử đồ", value: funnel?.tryOnCustomers ?? 0 },
    { label: "Khách bấm mua", value: funnel?.buyClickCustomers ?? 0 },
    { label: "Đơn brand xác nhận đã bán", value: funnel?.soldLeads ?? 0 },
  ];
  return values.map((step, i) => {
    const previous = i > 0 ? values[i - 1].value : 0;
    return { ...step, rate: i > 0 && previous > 0 ? Math.min(1, step.value / previous) : null };
  });
}
