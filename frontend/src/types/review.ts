export interface ReviewItemDto {
  id: string;
  productId: string;
  rating: number;
  content: string;
  imageUrls: string[];
  authorName: string;
  verifiedPurchase: boolean;
  status: string;
  rewardGranted: number;
  createdAt: string;
}

export interface ProductReviewsResponse {
  averageRating: number;
  totalCount: number;
  page: number;
  size: number;
  items: ReviewItemDto[];
}

export interface CreateReviewRequest {
  rating: number;
  content: string;
  imageUrls?: string[];
}
