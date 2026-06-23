export type FitType = "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZE";
export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "LIMITED";
export type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "INACTIVE";

export interface SizeChart {
  sizes: string[];
  measurements: Record<string, Record<string, number>>;
}

export interface Product {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  colors: string[];
  sizes: string[];
  sizeChart?: SizeChart;
  material?: string;
  fitType: FitType;
  styleTags: string[];
  occasionTags: string[];
  purchaseUrl: string;
  stockStatus: StockStatus;
  status: ProductStatus;
  aiTryOnEligible: boolean;
  description?: string;
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
