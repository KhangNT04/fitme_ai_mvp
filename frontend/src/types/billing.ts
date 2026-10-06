export type BillingPlanType = "SUBSCRIPTION" | "TOPUP";

export type PlanAudience = "CONSUMER" | "BRAND";

export type BillingOrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

export type BrandSubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  planType?: BillingPlanType;
  audience?: PlanAudience;
  priceVnd: number;
  fitkenAmount: number;
  billingPeriodDays?: number | null;
  active: boolean;
  sortOrder: number;
  discountPercent?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  /** Server-computed: discount applies right now. */
  discountActive?: boolean;
  /** Server-computed: price charged at checkout right now. */
  effectivePriceVnd?: number;
}

export type BillingPlanWrite = Omit<BillingPlan, "id" | "discountActive" | "effectivePriceVnd">;

export interface BrandBillingOrder {
  orderId: string;
  orderCode: number;
  planName?: string | null;
  listPriceVnd: number;
  discountPercentApplied: number;
  amountVnd: number;
  status: BillingOrderStatus;
  checkoutUrl?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
  /** Brand Plus end date after this order, once PAID. */
  plusEndsAt?: string | null;
}

export interface BrandPlusStatus {
  active: boolean;
  status?: BrandSubscriptionStatus | null;
  startsAt?: string | null;
  endsAt?: string | null;
  planAvailable: boolean;
  planId?: string | null;
  planCode?: string | null;
  planName?: string | null;
  billingPeriodDays?: number | null;
  listPriceVnd: number;
  effectivePriceVnd: number;
  discountActive: boolean;
  discountPercent?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  pendingOrder?: BrandBillingOrder | null;
}

export interface BrandPlusCheckoutResponse {
  orderId: string;
  orderCode: number;
  listPriceVnd: number;
  discountPercentApplied: number;
  amountVnd: number;
  checkoutUrl: string;
  mock: boolean;
}

export interface AdminBrandSubscription {
  brandId: string;
  brandName?: string | null;
  status: BrandSubscriptionStatus;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}
