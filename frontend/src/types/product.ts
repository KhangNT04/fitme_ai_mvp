export type FitType = "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZE";
export type TargetGender = "FEMALE" | "MALE" | "UNISEX";
export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "LIMITED";
export type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "INACTIVE" | "FLAGGED";

export interface SizeChartRow {
  sizeLabel: string;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  shoulderCm?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  weightMinKg?: number;
  weightMaxKg?: number;
}

export interface ProductImageDetail {
  url: string;
  type: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  imageDetails?: ProductImageDetail[];
  colors: string[];
  sizes: string[];
  sizeCharts?: SizeChartRow[];
  material?: string;
  fitType: FitType;
  targetGender?: TargetGender;
  styleTags: string[];
  occasionTags: string[];
  purchaseUrl: string;
  stockStatus: StockStatus;
  status: ProductStatus;
  aiTryOnEligible: boolean;
  description?: string;
  flagReason?: string;
}

export interface ProductFilters {
  category?: string;
  brandId?: string;
  priceMin?: number;
  priceMax?: number;
  style?: string;
  occasion?: string;
  color?: string;
  fitType?: string;
  size?: string;
  aiTryOnEligible?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}
