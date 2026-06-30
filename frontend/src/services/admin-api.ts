import apiClient, { unwrap } from "./api-client";
import { mapProduct, type BackendProduct } from "./product-mapper";
import type {
  AdminDashboardStats,
  FlaggedLink,
  StyleRule,
  OccasionRule,
} from "@/types/analytics";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";

function mapProducts(data: BackendProduct[]): Product[] {
  return (Array.isArray(data) ? data : []).map(mapProduct);
}

export const adminApi = {
  getDashboard: async (): Promise<AdminDashboardStats> => {
    const res = await apiClient.get("/admin/dashboard");
    return unwrap(res);
  },
  getBrands: async (): Promise<Brand[]> => {
    const res = await apiClient.get("/admin/brands");
    return unwrap(res);
  },
  approveBrand: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/brands/${id}/approve`);
  },
  rejectBrand: async (id: string, reason?: string): Promise<void> => {
    await apiClient.post(`/admin/brands/${id}/reject`, { reason });
  },
  suspendBrand: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/brands/${id}/suspend`);
  },
  getPendingProducts: async (): Promise<Product[]> => {
    const res = await apiClient.get("/admin/products/pending");
    return mapProducts(unwrap(res) as BackendProduct[]);
  },
  getFlaggedProducts: async (): Promise<Product[]> => {
    const res = await apiClient.get("/admin/products/flagged");
    return mapProducts(unwrap(res) as BackendProduct[]);
  },
  getProduct: async (id: string): Promise<Product> => {
    const res = await apiClient.get(`/admin/products/${id}`);
    return mapProduct(unwrap(res) as BackendProduct);
  },
  approveProduct: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/products/${id}/approve`);
  },
  rejectProduct: async (id: string, reason?: string): Promise<void> => {
    await apiClient.post(`/admin/products/${id}/reject`, { reason });
  },
  flagProduct: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/products/${id}/flag`, { reason });
  },
  getFlaggedLinks: async (): Promise<FlaggedLink[]> => {
    const res = await apiClient.get("/admin/flagged-links");
    return unwrap(res);
  },
  resolveFlaggedLink: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/flagged-links/${id}/resolve`);
  },
  rejectFlaggedLink: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/flagged-links/${id}/reject`);
  },
  getStyleRules: async (): Promise<StyleRule[]> => {
    const res = await apiClient.get("/admin/rules/styles");
    return unwrap(res);
  },
  createStyleRule: async (data: { name: string; description?: string; keywords?: string[]; tags?: string[]; active: boolean }): Promise<StyleRule> => {
    const res = await apiClient.post("/admin/rules/styles", {
      name: data.name,
      description: data.description ?? "",
      keywords: data.keywords ?? data.tags ?? [],
      active: data.active,
    });
    return unwrap(res);
  },
  updateStyleRule: async (id: string, data: Partial<StyleRule>): Promise<StyleRule> => {
    const res = await apiClient.put(`/admin/rules/styles/${id}`, {
      ...data,
      keywords: data.keywords ?? data.tags,
    });
    return unwrap(res);
  },
  deleteStyleRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/rules/styles/${id}`);
  },
  getOccasionRules: async (): Promise<OccasionRule[]> => {
    const res = await apiClient.get("/admin/rules/occasions");
    return unwrap(res);
  },
  createOccasionRule: async (data: { name: string; description?: string; keywords?: string[]; tags?: string[]; active: boolean }): Promise<OccasionRule> => {
    const res = await apiClient.post("/admin/rules/occasions", {
      name: data.name,
      description: data.description ?? "",
      keywords: data.keywords ?? data.tags ?? [],
      active: data.active,
    });
    return unwrap(res);
  },
  updateOccasionRule: async (id: string, data: Partial<OccasionRule>): Promise<OccasionRule> => {
    const res = await apiClient.put(`/admin/rules/occasions/${id}`, {
      ...data,
      keywords: data.keywords ?? data.tags,
    });
    return unwrap(res);
  },
  deleteOccasionRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/rules/occasions/${id}`);
  },
  getConsents: async (): Promise<unknown[]> => {
    const res = await apiClient.get("/admin/privacy/consents");
    return unwrap(res);
  },
  getDeletionRequests: async (): Promise<unknown[]> => {
    const res = await apiClient.get("/admin/privacy/deletion-requests");
    return unwrap(res);
  },
  processDeletionRequest: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/privacy/deletion-requests/${id}/process`);
  },
  getTryOnMonitoring: async (): Promise<unknown> => {
    const res = await apiClient.get("/admin/try-on/monitoring");
    return unwrap(res);
  },
  getFailedPreviews: async (): Promise<unknown[]> => {
    const res = await apiClient.get("/admin/try-on/failed-previews");
    return unwrap(res);
  },
};

export function getProductModerationWarnings(product: Product): string[] {
  const warnings: string[] = [];
  if (!product.images.length) warnings.push("Thiếu ảnh sản phẩm");
  if (!product.colors.length || !product.sizes.length) warnings.push("Thiếu biến thể màu/size");
  if (!product.sizeCharts?.length) warnings.push("Thiếu bảng size");
  return warnings;
}
