import apiClient, { unwrap } from "./api-client";
import type { Product, ProductFilters, ProductListResponse } from "@/types/product";

interface BackendProductImage {
  imageUrl: string;
}

interface BackendProductVariant {
  colorName?: string;
  sizeLabel?: string;
}

interface BackendProductTag {
  tagType?: string;
  tagValue?: string;
}

interface BackendProduct {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  material?: string;
  fitType?: Product["fitType"];
  purchaseUrl: string;
  stockStatus?: Product["stockStatus"];
  status: Product["status"];
  aiTryOnEligible: boolean;
  images?: BackendProductImage[];
  variants?: BackendProductVariant[];
  tags?: BackendProductTag[];
}

function mapProduct(raw: BackendProduct): Product {
  const colors = [...new Set((raw.variants || []).map((v) => v.colorName).filter(Boolean))] as string[];
  const sizes = [...new Set((raw.variants || []).map((v) => v.sizeLabel).filter(Boolean))] as string[];
  const tags = raw.tags || [];

  return {
    id: raw.id,
    brandId: raw.brandId,
    brandName: raw.brandName,
    name: raw.name,
    category: raw.category,
    price: Number(raw.price),
    images: (raw.images || []).map((img) => img.imageUrl),
    colors,
    sizes,
    material: raw.material,
    fitType: raw.fitType || "REGULAR",
    styleTags: tags.filter((t) => t.tagType === "STYLE").map((t) => t.tagValue || ""),
    occasionTags: tags.filter((t) => t.tagType === "OCCASION").map((t) => t.tagValue || ""),
    purchaseUrl: raw.purchaseUrl,
    stockStatus: raw.stockStatus || "IN_STOCK",
    status: raw.status,
    aiTryOnEligible: raw.aiTryOnEligible,
    description: raw.description,
  };
}

function mapListResponse(data: BackendProduct[] | ProductListResponse): ProductListResponse {
  if (Array.isArray(data)) {
    const items = data.map(mapProduct);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }
  return {
    ...data,
    items: (data.items || []).map((item) => mapProduct(item as unknown as BackendProduct)),
  };
}

export const productApi = {
  list: async (filters?: ProductFilters): Promise<ProductListResponse> => {
    const res = await apiClient.get("/products", { params: filters });
    return mapListResponse(unwrap(res) as BackendProduct[] | ProductListResponse);
  },
  getById: async (id: string): Promise<Product> => {
    const res = await apiClient.get(`/products/${id}`);
    return mapProduct(unwrap(res) as BackendProduct);
  },
  getSimilar: async (id: string): Promise<Product[]> => {
    const res = await apiClient.get(`/products/${id}/similar`);
    const data = unwrap(res) as BackendProduct[];
    return (Array.isArray(data) ? data : []).map(mapProduct);
  },
};
