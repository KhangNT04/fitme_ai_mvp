export type BrandStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface Brand {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  shopeeUrl?: string;
  tiktokShopUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: BrandStatus;
  createdAt: string;
}

export interface BrandOnboardingRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  shopeeUrl?: string;
  tiktokShopUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  contactEmail: string;
  contactPhone?: string;
}

export interface BrandApplicationResponse {
  brand?: Brand;
  hasApplication: boolean;
  message: string;
}

import type { SizeChartRow } from "@/types/product";

export interface CreateProductRequest {
  name: string;
  category: string;
  price: number;
  colors: string[];
  sizes: string[];
  material?: string;
  fitType: string;
  styleTags: string[];
  occasionTags: string[];
  purchaseUrl: string;
  description?: string;
  images?: string[];
  sizeCharts?: SizeChartRow[];
}
