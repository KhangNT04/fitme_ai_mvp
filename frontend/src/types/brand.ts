export type BrandStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface Brand {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone?: string;
  website?: string;
  shopeeUrl?: string;
  tiktokShopUrl?: string;
  instagram?: string;
  productCategory: string;
  description?: string;
  status: BrandStatus;
  createdAt: string;
}

export interface BrandOnboardingRequest {
  name: string;
  ownerName: string;
  email: string;
  phone?: string;
  website?: string;
  shopeeUrl?: string;
  tiktokShopUrl?: string;
  instagram?: string;
  productCategory: string;
  description?: string;
}

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
}
