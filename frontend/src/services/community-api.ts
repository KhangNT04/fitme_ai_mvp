import apiClient, { unwrap } from "./api-client";
import type {
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

export const communityApi = {
  getFeed: async (
    page = 0,
    size = COMMUNITY_PAGE_SIZE,
    filters?: { brandId?: string; styleLabel?: string; sort?: "latest" | "popular" },
  ): Promise<CommunityPostPage> => {
    const res = await apiClient.get("/community/posts", {
      params: { page, size, ...(filters ?? {}) },
    });
    return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
  },

  getByShareCode: async (shareCode: string): Promise<CommunityPost> => {
    const res = await apiClient.get(`/community/posts/${shareCode}`);
    return unwrap(res) as CommunityPost;
  },

  getAuthorPosts: async (
    authorId: string,
    page = 0,
    size = COMMUNITY_PAGE_SIZE,
  ): Promise<CommunityPostPage> => {
    const res = await apiClient.get(`/community/authors/${authorId}/posts`, { params: { page, size } });
    return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
  },

  getSavedPosts: async (page = 0, size = COMMUNITY_PAGE_SIZE): Promise<CommunityPostPage> => {
    const res = await apiClient.get("/me/community/saves", { params: { page, size } });
    return toPage(unwrap(res) as Partial<CommunityPostPage> | null, page, size);
  },

  createPost: async (payload: CreateCommunityPostRequest): Promise<CreateCommunityPostResult> => {
    const res = await apiClient.post("/community/posts", payload);
    return unwrap(res) as CreateCommunityPostResult;
  },

  deletePost: async (postId: string): Promise<void> => {
    const res = await apiClient.delete(`/community/posts/${postId}`);
    return unwrap(res);
  },

  setLike: async (postId: string, liked: boolean): Promise<CommunityPostInteraction> => {
    const res = liked
      ? await apiClient.post(`/community/posts/${postId}/like`)
      : await apiClient.delete(`/community/posts/${postId}/like`);
    return unwrap(res) as CommunityPostInteraction;
  },

  setSave: async (postId: string, saved: boolean): Promise<CommunityPostInteraction> => {
    const res = saved
      ? await apiClient.post(`/community/posts/${postId}/save`)
      : await apiClient.delete(`/community/posts/${postId}/save`);
    return unwrap(res) as CommunityPostInteraction;
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
    const res = await apiClient.get("/community/me");
    return unwrap(res) as CommunityProfile;
  },
};
