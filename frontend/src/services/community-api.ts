import apiClient, { unwrap } from "./api-client";
import { demoCommunity } from "@/lib/demo-community-store";
import { shouldUseDemoCommunity } from "@/lib/demo-data";
import type {
  CommunityAuthor,
  CommunityComment,
  CommunityCommentNotification,
  CommunityFilterOptions,
  CommunityPost,
  CommunityPostInteraction,
  CommunityPostPage,
  CommunityProfile,
  CreateCommunityPostRequest,
  CreateCommunityPostResult,
  UpdateCommunityPostRequest,
} from "@/types";

export const COMMUNITY_PAGE_SIZE = 24;

export function nextCommunityPage(last: CommunityPostPage): number | undefined {
  const loaded = (last.page + 1) * last.size;
  return last.items.length > 0 && loaded < last.total ? last.page + 1 : undefined;
}

function toPage(data: Partial<CommunityPostPage> | null, page: number, size: number): CommunityPostPage {
  return {
    items: data?.items ?? [],
    page: data?.page ?? page,
    size: data?.size ?? size,
    total: data?.total ?? 0,
  };
}

/**
 * Runs the real request, and falls back to the local demo dataset when the API is unavailable.
 *
 * The fallback only ever replaces a *failed* read: a live backend always wins, so a deployed
 * build shows real data as soon as the backend is available again.
 */
async function withDemoFallback<T>(
  request: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!shouldUseDemoCommunity()) throw error;
    return fallback();
  }
}

export const communityApi = {
  getFeed: async (
    page = 0,
    size = COMMUNITY_PAGE_SIZE,
    filters?: {
      brandId?: string;
      styleLabel?: string;
      occasion?: string;
      sort?: "latest" | "popular";
    },
  ): Promise<CommunityPostPage> => {
    return withDemoFallback(
      async () => {
        const res = await apiClient.get("/community/posts", {
          params: { page, size, ...(filters ?? {}) },
        });
        return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
      },
      () => {
        const sorted = filters?.sort === "popular" ? "popular" : "latest";
        if (sorted === "popular") {
          return demoCommunity.popularFeed(page, size);
        }
        // The demo dataset carries brand names, not ids, so the filter is matched by name.
        const brandName = filters?.brandId
          ? demoCommunity.filterOptions().brands.find((brand) => brand.value === filters.brandId)?.label
          : undefined;
        return demoCommunity.feed(page, size, {
          styleLabel: filters?.styleLabel,
          occasion: filters?.occasion,
          brandName,
        });
      },
    );
  },

  /** The style / occasion / brand filters available for the feed. */
  getFilterOptions: async (): Promise<CommunityFilterOptions> => {
    return withDemoFallback(
      async () => {
        const res = await apiClient.get("/community/filters");
        const data = unwrap(res) as Partial<CommunityFilterOptions> | null;
        return {
          styles: data?.styles ?? [],
          occasions: data?.occasions ?? [],
          brands: data?.brands ?? [],
        };
      },
      () => demoCommunity.filterOptions(),
    );
  },

  getByShareCode: async (shareCode: string): Promise<CommunityPost> => {
    return withDemoFallback(
      async () => {
        const res = await apiClient.get(`/community/posts/${shareCode}`);
        return unwrap(res) as CommunityPost;
      },
      () => {
        const post = demoCommunity.byShareCode(shareCode);
        if (!post) throw new Error("Outfit không tồn tại");
        return post;
      },
    );
  },

  getSavedPosts: async (page = 0, size = COMMUNITY_PAGE_SIZE): Promise<CommunityPostPage> => {
    return withDemoFallback(
      async () => {
        const res = await apiClient.get("/me/community/saves", { params: { page, size } });
        return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
      },
      () => demoCommunity.saved(page, size),
    );
  },

  /** Posts the signed-in user published, including the ones they removed. */
  getMyPosts: async (page = 0, size = COMMUNITY_PAGE_SIZE): Promise<CommunityPostPage> => {
    const res = await apiClient.get("/me/community/posts", { params: { page, size } });
    return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
  },

  createPost: async (payload: CreateCommunityPostRequest): Promise<CreateCommunityPostResult> => {
    // Publishing is never faked: a demo build must not claim a post went live.
    const res = await apiClient.post("/community/posts", payload);
    return unwrap(res) as CreateCommunityPostResult;
  },

  deletePost: async (postId: string): Promise<void> => {
    const res = await apiClient.delete(`/community/posts/${postId}`);
    return unwrap(res);
  },

  /** Edits the title and caption of a post the signed-in user published. */
  updatePost: async (
    postId: string,
    payload: UpdateCommunityPostRequest,
  ): Promise<CommunityPost> => {
    const res = await apiClient.patch(`/community/posts/${postId}`, payload);
    return unwrap(res) as CommunityPost;
  },

  // ── Author profiles ───────────────────────────────────────────────────────────────────────────

  /** The public community profile of the author behind this key. */
  getAuthor: async (authorKey: string): Promise<CommunityAuthor> => {
    const res = await apiClient.get(`/community/authors/${authorKey}`);
    return unwrap(res) as CommunityAuthor;
  },

  /** The public posts of the author behind this key. */
  getAuthorPosts: async (
    authorKey: string,
    page = 0,
    size = COMMUNITY_PAGE_SIZE,
  ): Promise<CommunityPostPage> => {
    const res = await apiClient.get(`/community/authors/${authorKey}/posts`, { params: { page, size } });
    return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
  },

  followAuthor: async (authorKey: string): Promise<boolean> => {
    const res = await apiClient.post(`/community/authors/${authorKey}/follow`);
    return Boolean(unwrap(res));
  },

  unfollowAuthor: async (authorKey: string): Promise<boolean> => {
    const res = await apiClient.delete(`/community/authors/${authorKey}/follow`);
    return Boolean(unwrap(res));
  },

  setLike: async (postId: string, liked: boolean): Promise<CommunityPostInteraction> => {
    return withDemoFallback(
      async () => {
        const res = liked
          ? await apiClient.post(`/community/posts/${postId}/like`)
          : await apiClient.delete(`/community/posts/${postId}/like`);
        return unwrap(res) as CommunityPostInteraction;
      },
      () => {
        const result = demoCommunity.toggleLike(postId, liked);
        if (!result) throw new Error("Không tìm thấy bài đăng");
        return result;
      },
    );
  },

  setSave: async (postId: string, saved: boolean): Promise<CommunityPostInteraction> => {
    return withDemoFallback(
      async () => {
        const res = saved
          ? await apiClient.post(`/community/posts/${postId}/save`)
          : await apiClient.delete(`/community/posts/${postId}/save`);
        return unwrap(res) as CommunityPostInteraction;
      },
      () => {
        const result = demoCommunity.toggleSave(postId, saved);
        if (!result) throw new Error("Không tìm thấy bài đăng");
        return result;
      },
    );
  },

  follow: async (userId: string): Promise<boolean> => {
    const res = await apiClient.post(`/community/users/${userId}/follow`);
    return Boolean(unwrap(res));
  },

  unfollow: async (userId: string): Promise<boolean> => {
    const res = await apiClient.delete(`/community/users/${userId}/follow`);
    return Boolean(unwrap(res));
  },

  getMyProfile: async (): Promise<CommunityProfile> => {
    return withDemoFallback(
      async () => {
        const res = await apiClient.get("/community/me");
        return unwrap(res) as CommunityProfile;
      },
      () => demoCommunity.profile(),
    );
  },

  // ── Comments ───────────────────────────────────────────────────────────────────────────────

  getComments: async (postId: string): Promise<CommunityComment[]> => {
    return withDemoFallback(
      async () => {
        const res = await apiClient.get(`/community/posts/${postId}/comments`);
        return (unwrap(res) as CommunityComment[] | null) ?? [];
      },
      () => demoCommunity.comments(postId),
    );
  },

  addComment: async (postId: string, content: string, parentId?: string): Promise<CommunityComment> => {
    const res = await apiClient.post(`/community/posts/${postId}/comments`, {
      content,
      ...(parentId ? { parentId } : {}),
    });
    return unwrap(res) as CommunityComment;
  },

  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    const res = await apiClient.delete(`/community/posts/${postId}/comments/${commentId}`);
    return unwrap(res);
  },

  getNotifications: async (limit = 20): Promise<CommunityCommentNotification[]> => {
    const res = await apiClient.get("/me/community/notifications", { params: { limit } });
    return (unwrap(res) as CommunityCommentNotification[] | null) ?? [];
  },
};
