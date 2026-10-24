export interface CommunityProductRef {
  productId: string;
  name: string;
  imageUrl?: string | null;
  price?: number | null;
}

/** Public shape of a community post. Never carries the author's email or account id. */
export interface CommunityPost {
  id: string;
  shareCode: string;
  shareUrl: string;
  title?: string | null;
  caption?: string | null;
  styleLabel?: string | null;
  occasion?: string | null;
  imageUrl: string;
  authorDisplayName: string;
  authorInitials: string;
  brandNames: string[];
  products: CommunityProductRef[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  mine: boolean;
  createdAt: string;
}

export interface CommunityPostPage {
  items: CommunityPost[];
  page: number;
  size: number;
  total: number;
}

export interface CommunityPostInteraction {
  postId: string;
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
}

export interface CommunityProfile {
  publishedPosts: number;
  savedPosts: number;
  followers: number;
  following: number;
  totalLikesReceived: number;
}

export interface CreateCommunityPostRequest {
  galleryImageId?: string;
  tryOnRequestId?: string;
  recommendationId?: string;
  title?: string;
  caption?: string;
}

export interface CreateCommunityPostResult {
  post: CommunityPost;
  shareUrl: string;
}
