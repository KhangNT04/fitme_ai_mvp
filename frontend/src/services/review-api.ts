import apiClient, { unwrap } from "./api-client";
import {
  ProductReviewsResponse,
  CreateReviewRequest,
  FeaturedReview,
  HelpfulVoteResponse,
} from "@/types";
import { uploadMultipartFile } from "@/lib/upload-file";

export const reviewApi = {
  getProductReviews: async (productId: string, page = 0, size = 10): Promise<ProductReviewsResponse> => {
    const res = await apiClient.get(`/products/${productId}/reviews`, { params: { page, size } });
    return unwrap(res);
  },
  getFeaturedReviews: async (limit = 6): Promise<FeaturedReview[]> => {
    const res = await apiClient.get("/products/featured-reviews", { params: { limit } });
    const data = unwrap(res);
    return Array.isArray(data) ? (data as FeaturedReview[]) : [];
  },
  createReview: async (productId: string, data: CreateReviewRequest): Promise<void> => {
    const res = await apiClient.post(`/products/${productId}/reviews`, data);
    return unwrap(res);
  },
  setHelpful: async (reviewId: string, helpful: boolean): Promise<HelpfulVoteResponse> => {
    const res = helpful
      ? await apiClient.post(`/reviews/${reviewId}/helpful`)
      : await apiClient.delete(`/reviews/${reviewId}/helpful`);
    return unwrap(res);
  },
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const res = await uploadMultipartFile<{ url: string }>("/reviews/images", file);
    return res;
  },
};
