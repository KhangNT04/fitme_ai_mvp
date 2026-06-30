import apiClient, { unwrap } from "./api-client";
import { uploadMultipartFile } from "@/lib/upload-file";
import { mapProduct, toBackendProductRequest } from "./product-mapper";
import type {
  Brand,
  BrandApplicationResponse,
  BrandOnboardingRequest,
  CreateProductRequest,
} from "@/types/brand";
import type { Product } from "@/types/product";
import type { DashboardStats, BrandAnalytics } from "@/types/analytics";
import type { BackendProduct } from "./product-mapper";

export const publicBrandApi = {
  list: async (): Promise<Brand[]> => {
    const res = await apiClient.get("/brands");
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },
  getById: async (id: string): Promise<Brand> => {
    const res = await apiClient.get(`/brands/${id}`);
    return unwrap(res);
  },
};

export const brandApi = {
  apply: async (data: BrandOnboardingRequest): Promise<Brand> => {
    const res = await apiClient.post("/brand/applications", data);
    return unwrap(res);
  },
  getMyApplication: async (): Promise<BrandApplicationResponse> => {
    const res = await apiClient.get("/brand/applications/me");
    return unwrap(res);
  },
  onboarding: async (data: BrandOnboardingRequest): Promise<Brand> => {
    const res = await apiClient.post("/brand/onboarding", data);
    return unwrap(res);
  },
  getMe: async (): Promise<Brand> => {
    const res = await apiClient.get("/brand/me");
    return unwrap(res);
  },
  updateMe: async (data: Partial<BrandOnboardingRequest>): Promise<Brand> => {
    const res = await apiClient.put("/brand/me", data);
    return unwrap(res);
  },
  uploadLogo: async (file: File): Promise<Brand> => {
    return uploadMultipartFile<Brand>("/brand/me/logo", file);
  },
  uploadProductImage: async (file: File): Promise<string> => {
    const data = await uploadMultipartFile<{ url: string }>("/brand/media/images", file);
    return data.url;
  },
  getProducts: async (): Promise<Product[]> => {
    const res = await apiClient.get("/brand/products");
    const data = unwrap(res) as BackendProduct[];
    return (Array.isArray(data) ? data : []).map(mapProduct);
  },
  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const res = await apiClient.post("/brand/products", toBackendProductRequest(data));
    return mapProduct(unwrap(res) as BackendProduct);
  },
  getProduct: async (id: string): Promise<Product> => {
    const res = await apiClient.get(`/brand/products/${id}`);
    return mapProduct(unwrap(res) as BackendProduct);
  },
  updateProduct: async (id: string, data: CreateProductRequest): Promise<Product> => {
    const res = await apiClient.put(`/brand/products/${id}`, toBackendProductRequest(data));
    return mapProduct(unwrap(res) as BackendProduct);
  },
  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/brand/products/${id}`);
  },
  submitReview: async (id: string): Promise<void> => {
    await apiClient.post(`/brand/products/${id}/submit-review`);
  },
  getDashboard: async (): Promise<DashboardStats> => {
    const res = await apiClient.get("/brand/dashboard");
    return unwrap(res);
  },
  getAnalyticsRedirect: async (): Promise<BrandAnalytics> => {
    const res = await apiClient.get("/brand/analytics/redirect");
    return unwrap(res);
  },
  getAnalyticsDropoff: async (): Promise<BrandAnalytics> => {
    const res = await apiClient.get("/brand/analytics/dropoff");
    return unwrap(res);
  },
  getAnalyticsHesitation: async (): Promise<BrandAnalytics> => {
    const res = await apiClient.get("/brand/analytics/hesitation");
    return unwrap(res);
  },
  getAnalyticsTryOn: async (): Promise<BrandAnalytics> => {
    const res = await apiClient.get("/brand/analytics/try-on");
    return unwrap(res);
  },
  getProductAnalytics: async (id: string): Promise<BrandAnalytics> => {
    const res = await apiClient.get(`/brand/products/${id}/analytics`);
    return unwrap(res);
  },
};
