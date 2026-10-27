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
  /** PUBLIC, HIDDEN (moderated) or REMOVED (deleted by the author). */
  visibility?: string;
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
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
}

export interface CommunityCommentNotification {
  id: string;
  postId: string;
  postShareCode: string;
  postTitle?: string | null;
  actorDisplayName: string;
  actorInitials: string;
  content: string;
  reply: boolean;
  createdAt: string;
}

/** A comment on a post. `replies` holds the single level of answers to this comment. */
export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  authorDisplayName: string;
  authorInitials: string;
  mine: boolean;
  canDelete: boolean;
  parentId?: string | null;
  parentAuthorDisplayName?: string | null;
  createdAt: string;
  replies: CommunityComment[];
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
