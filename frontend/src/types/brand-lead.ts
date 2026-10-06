export type LeadCustomerStatus = "VISIBLE" | "WITHDRAWN" | "ANONYMIZED";

export interface BrandLead {
  id: string;
  productId: string;
  productName: string;
  /** Only set while customerStatus is VISIBLE. */
  customerName?: string | null;
  customerEmail?: string | null;
  customerStatus: LeadCustomerStatus;
  size?: string | null;
  color?: string | null;
  createdAt: string;
  confirmedSoldAt?: string | null;
}

export interface BrandLeadSummary {
  total: number;
  sold: number;
  last30Days: number;
}

export interface BrandLeadPage {
  /** True when the brand has no Brand Plus: only `summary` is filled. */
  plusRequired: boolean;
  summary: BrandLeadSummary;
  items: BrandLead[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export type LeadSoldFilter = "all" | "sold" | "unsold";

export interface BrandLeadFilters {
  from: string;
  to: string;
  productId: string;
  sold: LeadSoldFilter;
  page: number;
}
