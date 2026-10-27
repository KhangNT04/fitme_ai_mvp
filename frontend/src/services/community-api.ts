import apiClient, { unwrap } from "./api-client";
import { demoCommunity } from "@/lib/demo-community-store";
import { shouldUseDemoCommunity } from "@/lib/demo-data";
import type {
  CommunityComment,
  CommunityCommentNotification,
  CommunityPost,
  CommunityPostInteraction,
  CommunityPostPage,
  CommunityProfile,
  CreateCommunityPostRequest,
  CreateCommunityPostResult,
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
    filters?: { brandId?: string; styleLabel?: string; sort?: "latest" | "popular" },
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
        return sorted === "popular"
          ? demoCommunity.popularFeed(page, size)
          : demoCommunity.feed(page, size);
      },
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

  getAuthorPosts: async (
    authorId: string,
    page = 0,
    size = COMMUNITY_PAGE_SIZE,
  ): Promise<CommunityPostPage> => {
    return withDemoFallback(
      async () => {
        const res = await apiClient.get(`/community/authors/${authorId}/posts`, { params: { page, size } });
        return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
      },
      () => demoCommunity.feed(page, size),
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
