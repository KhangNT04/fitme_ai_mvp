import apiClient, { unwrap } from "./api-client";
import { mapProduct, type BackendProduct } from "./product-mapper";
import type { Product, ProductFilters, ProductListResponse } from "@/types/product";

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

export { mapProduct, toBackendProductRequest } from "./product-mapper";
