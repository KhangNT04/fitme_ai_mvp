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
  helpfulCount: number;
  helpfulByMe: boolean;
  mine: boolean;
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

export interface CreateReviewResponse {
  rewardGranted: number;
  rewardLimitReached: boolean;
  rewardIntended?: number | null;
  rewardCapped?: boolean | null;
  maxBalance?: number | null;
}

export interface HelpfulVoteResponse {
  reviewId: string;
  helpfulCount: number;
  helpfulByMe: boolean;
}

export interface FeaturedReview {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  content: string;
  authorName: string;
  imageUrl: string | null;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}
