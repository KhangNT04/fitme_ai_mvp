/**
 * In-memory state for the demo community feed.
 *
 * The demo dataset lives only in the browser tab: likes and saves are tracked here so the feed
 * behaves like the real one during a demo, and nothing is ever written to the backend.
 */
import { DEMO_COMMUNITY_POSTS } from "./demo-community-data";
import type {
  CommunityComment,
  CommunityPost,
  CommunityPostInteraction,
  CommunityPostPage,
  CommunityProfile,
} from "@/types";

const SAVED_KEY = "fitme_demo_saved_posts";

function readSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // Private-mode browsers reject writes; saving still works for this session.
  }
}

/** Post id -> number of extra likes the demo user gave it. */
let extraLikes = new Map<string, number>();
let savedIds = new Set<string>();
/** Post id -> the comment thread the demo user wrote. */
let demoComments = new Map<string, CommunityComment[]>();

function hydrate(): void {
  if (typeof window === "undefined") return;
  savedIds = new Set(readSavedIds());
}

/** Demo user identity — a single anonymous viewer interacting with the demo feed. */
const DEMO_VIEWER = "demo-viewer";

function applyViewerState(post: CommunityPost): CommunityPost {
  const extra = extraLikes.get(post.id) ?? 0;
  return {
    ...post,
    likeCount: post.likeCount + extra,
    likedByMe: extra > 0,
    savedByMe: savedIds.has(post.id),
    mine: false,
  };
}

function sortedPosts(): CommunityPost[] {
  return [...DEMO_COMMUNITY_POSTS]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(applyViewerState);
}

export const demoCommunity = {
  feed(page = 0, size = 24): CommunityPostPage {
    hydrate();
    const items = sortedPosts();
    const start = Math.max(page, 0) * size;
    return {
      items: items.slice(start, start + size),
      page: Math.max(page, 0),
      size,
      total: items.length,
    };
  },

  popularFeed(page = 0, size = 24): CommunityPostPage {
    hydrate();
    const items = sortedPosts().sort((a, b) => b.likeCount - a.likeCount);
    const start = Math.max(page, 0) * size;
    return {
      items: items.slice(start, start + size),
      page: Math.max(page, 0),
      size,
      total: items.length,
    };
  },

  byShareCode(shareCode: string): CommunityPost | null {
    hydrate();
    const post = DEMO_COMMUNITY_POSTS.find((item) => item.shareCode === shareCode);
    return post ? applyViewerState(post) : null;
  },

  saved(page = 0, size = 24): CommunityPostPage {
    hydrate();
    const items = sortedPosts().filter((post) => savedIds.has(post.id));
    const start = Math.max(page, 0) * size;
    return {
      items: items.slice(start, start + size),
      page: Math.max(page, 0),
      size,
      total: items.length,
    };
  },

  toggleLike(postId: string, liked: boolean): CommunityPostInteraction | null {
    const post = DEMO_COMMUNITY_POSTS.find((item) => item.id === postId);
    if (!post) return null;
    const current = extraLikes.get(postId) ?? 0;
    const next = liked ? current + 1 : Math.max(0, current - 1);
    extraLikes.set(postId, next);
    return {
      postId,
      likeCount: post.likeCount + next,
      commentCount: post.commentCount,
      likedByMe: next > 0,
      savedByMe: savedIds.has(postId),
    };
  },

  toggleSave(postId: string, saved: boolean): CommunityPostInteraction | null {
    const post = DEMO_COMMUNITY_POSTS.find((item) => item.id === postId);
    if (!post) return null;
    if (saved) {
      savedIds.add(postId);
    } else {
      savedIds.delete(postId);
    }
    writeSavedIds([...savedIds]);
    const extra = extraLikes.get(postId) ?? 0;
    return {
      postId,
      likeCount: post.likeCount + extra,
      commentCount: post.commentCount,
      likedByMe: extra > 0,
      savedByMe: saved,
    };
  },

  /** Demo comment thread for a post. Empty for posts the demo user never commented on. */
  comments(postId: string): CommunityComment[] {
    hydrate();
    return demoComments.get(postId) ?? [];
  },

  /** Records a demo comment so the thread grows like a real one. */
  addComment(postId: string, content: string, parentId?: string): CommunityComment {
    const now = new Date().toISOString();
    const comment: CommunityComment = {
      id: `demo-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      postId,
      content,
      authorDisplayName: "Bạn",
      authorInitials: "BN",
      mine: true,
      canDelete: true,
      parentId: parentId ?? null,
      parentAuthorDisplayName: null,
      createdAt: now,
      replies: [],
    };
    const thread = [...(demoComments.get(postId) ?? [])];
    if (!parentId) {
      thread.push(comment);
    } else {
      const parent = thread.find((item) => item.id === parentId);
      if (parent) {
        parent.replies = [...parent.replies, comment];
      } else {
        thread.push(comment);
      }
    }
    demoComments.set(postId, thread);
    return comment;
  },

  profile(): CommunityProfile {
    hydrate();
    const items = sortedPosts();
    return {
      publishedPosts: items.length,
      savedPosts: savedIds.size,
      followers: 128,
      following: 34,
      totalLikesReceived: items.reduce((sum, post) => sum + post.likeCount, 0),
    };
  },

  /** Total likes across the demo feed — used by the profile summary fallback. */
  totalLikes(): number {
    return DEMO_COMMUNITY_POSTS.reduce((sum, post) => sum + post.likeCount, 0);
  },

  reset(): void {
    extraLikes = new Map();
    savedIds = new Set();
    demoComments = new Map();
    writeSavedIds([]);
  },
};

export { DEMO_VIEWER };
