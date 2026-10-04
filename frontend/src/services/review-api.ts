import apiClient, { unwrap } from "./api-client";
import { ProductReviewsResponse, CreateReviewRequest } from "@/types";
import { uploadMultipartFile } from "@/lib/upload-file";

export const reviewApi = {
  getProductReviews: async (productId: string, page = 0, size = 10): Promise<ProductReviewsResponse> => {
    const res = await apiClient.get(`/products/${productId}/reviews`, { params: { page, size } });
    return unwrap(res);
  },
  createReview: async (productId: string, data: CreateReviewRequest): Promise<void> => {
    const res = await apiClient.post(`/products/${productId}/reviews`, data);
    return unwrap(res);
  },
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const res = await uploadMultipartFile<{ url: string }>("/reviews/images", file);
    return res;
  },
};
