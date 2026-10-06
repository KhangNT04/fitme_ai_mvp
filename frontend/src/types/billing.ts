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

export type BrandVoucherStatus = "ISSUED" | "RESERVED" | "USED" | "REVOKED" | "EXPIRED";

/** Where the percent applied to a Brand Plus checkout comes from (discounts never stack). */
export type PlanDiscountSource = "NONE" | "WINDOW" | "VOUCHER";

export interface BrandBillingOrder {
  orderId: string;
  orderCode: number;
  planName?: string | null;
  listPriceVnd: number;
  discountPercentApplied: number;
  voucherCode?: string | null;
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
  discountSource: PlanDiscountSource;
  amountVnd: number;
  checkoutUrl: string;
  mock: boolean;
  voucherId?: string | null;
  voucherCode?: string | null;
  voucherApplied: boolean;
  voucherIgnoredReason?: string | null;
}

export interface BrandPlusQuote {
  listPriceVnd: number;
  billingPeriodDays: number;
  /** Running time-window discount (0 when none). */
  windowPercent: number;
  voucherId?: string | null;
  voucherCode?: string | null;
  voucherPercent?: number | null;
  appliedPercent: number;
  source: PlanDiscountSource;
  amountVnd: number;
  voucherApplied: boolean;
  /** The running discount is at least as large, so the voucher is kept for later. */
  voucherIgnoredReason?: string | null;
}

export interface BrandVoucher {
  id: string;
  code: string;
  campaignName?: string | null;
  discountPercent: number;
  status: BrandVoucherStatus;
  /** ISSUED and not expired: can be picked at checkout. */
  usable: boolean;
  issuedAt?: string | null;
  expiresAt?: string | null;
  usedAt?: string | null;
  reservedOrderCode?: number | null;
}

export interface VoucherCampaign {
  id: string;
  name: string;
  description?: string | null;
  discountPercent: number;
  vouchersPerBrand: number;
  maxBrands: number;
  validFrom?: string | null;
  validUntil?: string | null;
  active: boolean;
  /** validUntil has passed: no more vouchers can be issued. */
  ended: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  issuedBrandCount: number;
  voucherCount: number;
  voucherCountsByStatus: Record<BrandVoucherStatus, number>;
}

export type VoucherCampaignWrite = Pick<
  VoucherCampaign,
  "name" | "description" | "discountPercent" | "vouchersPerBrand" | "maxBrands" | "validFrom" | "validUntil" | "active"
>;

export interface AdminBrandVoucher {
  id: string;
  campaignId: string;
  brandId: string;
  brandName?: string | null;
  code: string;
  discountPercent: number;
  status: BrandVoucherStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  reservedOrderCode?: number | null;
  usedOrderCode?: number | null;
  usedAt?: string | null;
  revokedAt?: string | null;
}

export interface IssueVouchersResult {
  issued: { brandId: string; brandName: string }[];
  skipped: { brandId: string; brandName: string }[];
  vouchersIssued: number;
  campaign: VoucherCampaign;
}

export interface AdminBrandSubscription {
  brandId: string;
  brandName?: string | null;
  status: BrandSubscriptionStatus;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}
