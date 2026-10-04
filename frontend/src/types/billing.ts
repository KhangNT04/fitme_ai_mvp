export type BillingPlanType = "SUBSCRIPTION" | "TOPUP";

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  planType?: BillingPlanType;
  priceVnd: number;
  fitkenAmount: number;
  freeshipVouchers: number;
  freeshipMaxDiscountVnd: number;
  billingPeriodDays?: number | null;
  active: boolean;
  sortOrder: number;
}

export type BillingPlanWrite = Omit<BillingPlan, "id">;
