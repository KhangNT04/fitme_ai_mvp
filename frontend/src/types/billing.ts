export type BillingPlanType = "SUBSCRIPTION" | "TOPUP";

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  planType: BillingPlanType;
  priceVnd: number;
  quotaAmount: number;
  includesDashboard: boolean;
  billingPeriodDays?: number | null;
  active: boolean;
  sortOrder: number;
}

export interface BrandBillingSummary {
  brandId: string;
  subscriptionRemaining: number;
  topupRemaining: number;
  totalRemaining: number;
  dashboardEnabled: boolean;
  subscription?: {
    planId: string;
    planName: string;
    status: "ACTIVE" | "EXPIRED" | "CANCELLED";
    startsAt: string;
    expiresAt: string;
  } | null;
  recentOrders: Array<{
    id: string;
    planName: string;
    planType: BillingPlanType;
    amountVnd: number;
    status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
    createdAt: string;
    paidAt?: string | null;
  }>;
}

export interface AdminBrandBillingDetail extends BrandBillingSummary {
  brandName: string;
  contactEmail?: string | null;
  brandStatus: string;
  billingActive: boolean;
}

export interface AdminBrandBillingListItem {
  id: string;
  name: string;
  contactEmail?: string | null;
  status: string;
  createdAt: string;
  totalQuotaRemaining: number;
  activePlanName?: string | null;
  dashboardEnabled: boolean;
}

export interface CheckoutResponse {
  orderId: string;
  payosOrderCode: number;
  checkoutUrl: string;
  mockPaid: boolean;
}
