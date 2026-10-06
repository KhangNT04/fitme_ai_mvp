import apiClient, { unwrap } from "./api-client";
import { mapProduct, type BackendProduct } from "./product-mapper";
import type {
  AdminDashboardStats,
  AdminMetrics,
  PayingCustomersReport,
  FlaggedLink,
  StyleRule,
  OccasionRule,
  TrafficStats,
} from "@/types/analytics";
import type { Brand } from "@/types/brand";
import type { Product } from "@/types/product";
import type { TryOnAvatar } from "@/types/tryon";
import { uploadMultipartFile } from "@/lib/upload-file";

export interface TryOnAvatarUpsert {
  label?: string;
  imageUrl?: string;
  active?: boolean;
}

function mapProducts(data: BackendProduct[]): Product[] {
  return (Array.isArray(data) ? data : []).map(mapProduct);
}

export const adminApi = {
  getDashboard: async (): Promise<AdminDashboardStats> => {
    const res = await apiClient.get("/admin/dashboard");
    return unwrap(res);
  },
  getMetrics: async (days: number): Promise<AdminMetrics> => {
    const res = await apiClient.get("/admin/metrics", { params: { days } });
    return unwrap(res);
  },
  getTraffic: async (days: number): Promise<TrafficStats> => {
    const res = await apiClient.get("/admin/traffic", { params: { days } });
    return unwrap(res);
  },
  getPayingCustomers: async (): Promise<PayingCustomersReport> => {
    const res = await apiClient.get("/admin/reports/paying-customers");
    return unwrap(res);
  },
  downloadPayingCustomersCsv: async (): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get("/admin/reports/paying-customers/export", { responseType: "blob" });
    const disposition = String(res.headers["content-disposition"] ?? "");
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    return { blob: res.data as Blob, filename: match?.[1] ?? "fitme-khach-tra-tien.csv" };
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
  getBrandPartnerships: async (): Promise<BrandPartnership[]> => {
    const res = await apiClient.get("/admin/brand-partnerships");
    const data = unwrap(res) as BrandPartnership[];
    return Array.isArray(data) ? data : [];
  },
  createBrandPartnership: async (brandAId: string, brandBId: string): Promise<BrandPartnership> => {
    const res = await apiClient.post("/admin/brand-partnerships", { brandAId, brandBId });
    return unwrap(res);
  },
  getGalleryStats: async (): Promise<GalleryStats> => {
    const res = await apiClient.get("/admin/gallery/stats");
    return unwrap(res);
  },
  listShareClaims: async (status?: ShareClaimStatus): Promise<ShareClaim[]> => {
    const res = await apiClient.get("/admin/rewards/shares", {
      params: status ? { status } : undefined,
    });
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },
  rejectShareClaim: async (id: string, note?: string): Promise<ShareClaim> => {
    const res = await apiClient.post(`/admin/rewards/shares/${id}/reject`, note ? { note } : {});
    return unwrap(res);
  },
  listAdminReviews: async (status?: ReviewStatus): Promise<AdminReviewItem[]> => {
    const res = await apiClient.get("/admin/reviews", {
      params: status ? { status } : undefined,
    });
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },
  hideReview: async (
    id: string,
    body?: { note?: string; revokeReward?: boolean },
  ): Promise<AdminReviewItem> => {
    const res = await apiClient.post(`/admin/reviews/${id}/hide`, body ?? {});
    return unwrap(res);
  },
  listUsers: async (params: {
    q?: string;
    role?: AdminUserRole;
    status?: AdminUserStatus;
    page?: number;
    size?: number;
  }): Promise<AdminUserPage> => {
    const res = await apiClient.get("/admin/users", { params });
    return unwrap(res);
  },
  setUserStatus: async (userId: string, status: AdminUserStatus): Promise<AdminUser> => {
    const res = await apiClient.patch(`/admin/users/${userId}/status`, { status });
    return unwrap(res);
  },
  setUserConsumerPlan: async (userId: string, plan: "FREE" | "PREMIUM"): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/consumer-plan`, { plan });
  },
  listTryOnAvatars: async (): Promise<TryOnAvatar[]> => {
    const res = await apiClient.get("/admin/tryon-avatars");
    return unwrap(res);
  },
  createTryOnAvatar: async (data: TryOnAvatarUpsert): Promise<TryOnAvatar> => {
    const res = await apiClient.post("/admin/tryon-avatars", data);
    return unwrap(res);
  },
  updateTryOnAvatar: async (id: string, data: TryOnAvatarUpsert): Promise<TryOnAvatar> => {
    const res = await apiClient.put(`/admin/tryon-avatars/${id}`, data);
    return unwrap(res);
  },
  deleteTryOnAvatar: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/tryon-avatars/${id}`);
  },
  moveTryOnAvatar: async (id: string, direction: "UP" | "DOWN"): Promise<TryOnAvatar[]> => {
    const res = await apiClient.post(`/admin/tryon-avatars/${id}/move`, { direction });
    return unwrap(res);
  },
  uploadTryOnAvatarImage: async (file: File): Promise<string> => {
    const data = await uploadMultipartFile<{ url: string }>("/admin/tryon-avatars/images", file);
    return data.url;
  },
  getConsumerFitken: async (userId: string): Promise<AdminFitkenDetail> => {
    const res = await apiClient.get(`/admin/consumers/${userId}/fitken`);
    return unwrap(res);
  },
  adjustConsumerFitken: async (
    userId: string,
    data: { delta: number; note?: string },
  ): Promise<AdminFitkenDetail> => {
    const res = await apiClient.post(`/admin/consumers/${userId}/fitken/adjust`, data);
    return unwrap(res);
  },
};

export interface GalleryStats {
  totalImages: number;
  imagesLast7Days: number;
  usersWithImages: number;
}

export type ShareClaimStatus = "APPROVED" | "REJECTED";

export interface ShareClaim {
  id: string;
  userId: string;
  postUrl: string;
  platform: string;
  status: ShareClaimStatus;
  rewardGranted: number;
  tryOnRequestId?: string | null;
  galleryImageId?: string | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export type ReviewStatus = "VISIBLE" | "HIDDEN";

export interface AdminReviewItem {
  id: string;
  productId: string;
  rating: number;
  content: string;
  imageUrls: string[];
  authorName: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  rewardGranted: number;
  createdAt: string;
}

export type AdminUserRole = "USER" | "BRAND_OWNER" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "SUSPENDED";

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  emailVerified: boolean;
  consumerPlan: "FREE" | "PREMIUM";
  fitkenBalance: number;
  createdAt: string;
  lastActiveDate?: string | null;
  brandName?: string | null;
  signupSource?: string | null;
}

export interface AdminUserPage {
  items: AdminUser[];
  total: number;
  page: number;
  size: number;
  summary: {
    totalAccounts: number;
    consumers: number;
    brandOwners: number;
    admins: number;
    suspended: number;
    premiumUsers: number;
  };
}

export interface AdminFitkenDetail {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  wallet: {
    balance: number;
    subscriptionRemaining: number;
    bonusRemaining: number;
    trialGranted: boolean;
    tryOnCost: number;
    plan: string;
  };
  ledger: Array<{
    id: string;
    entryType: string;
    delta: number;
    balanceAfter: number;
    note?: string | null;
    createdAt: string;
  }>;
}

export interface BrandPartnership {
  id: string;
  brandAId: string;
  brandBId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getProductModerationWarnings(product: Product): string[] {
  const warnings: string[] = [];
  if (!product.images.length) warnings.push("Thiếu ảnh sản phẩm");
  if (!product.colors.length || !product.sizes.length) warnings.push("Thiếu biến thể màu/size");
  if (!product.sizeCharts?.length) warnings.push("Thiếu bảng size");
  return warnings;
}
