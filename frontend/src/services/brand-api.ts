import apiClient, { unwrap } from "./api-client";
import type {
  Brand,
  BrandOnboardingRequest,
  CreateProductRequest,
} from "@/types/brand";
import type { Product } from "@/types/product";
import type { DashboardStats, BrandAnalytics } from "@/types/analytics";

export const brandApi = {
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
  getProducts: async (): Promise<Product[]> => {
    const res = await apiClient.get("/brand/products");
    return unwrap(res);
  },
  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const res = await apiClient.post("/brand/products", data);
    return unwrap(res);
  },
  getProduct: async (id: string): Promise<Product> => {
    const res = await apiClient.get(`/brand/products/${id}`);
    return unwrap(res);
  },
  updateProduct: async (id: string, data: Partial<CreateProductRequest>): Promise<Product> => {
    const res = await apiClient.put(`/brand/products/${id}`, data);
    return unwrap(res);
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
