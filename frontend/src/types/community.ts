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
  /**
   * Public, random identifier of the author, used to build their community profile link.
   * It is not the account id, so it exposes nothing personal.
   */
  authorKey?: string | null;
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
  /** The user's own public author key, used to open their community profile page. */
  authorKey?: string | null;
}

/** The public community profile of an author, addressed by their random author key. */
export interface CommunityAuthor {
  authorKey: string;
  displayName: string;
  initials: string;
  publishedPosts: number;
  totalLikes: number;
  totalComments: number;
  followedByMe: boolean;
}

/** A filter chip on the feed, with the number of public posts behind it. */
export interface CommunityFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface CommunityFilterOptions {
  styles: CommunityFilterOption[];
  occasions: CommunityFilterOption[];
  brands: CommunityFilterOption[];
}

export interface UpdateCommunityPostRequest {
  title?: string;
  caption?: string;
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
