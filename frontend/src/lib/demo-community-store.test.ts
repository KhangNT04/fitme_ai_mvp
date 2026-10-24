import { describe, expect, it, beforeEach } from "vitest";
import { DEMO_COMMUNITY_POSTS } from "./demo-community-data";
import { demoCommunity } from "./demo-community-store";

describe("demo community dataset", () => {
  beforeEach(() => {
    demoCommunity.reset();
  });

  it("has a feed with unique share codes", () => {
    const feed = demoCommunity.feed(0, 24);
    expect(feed.items.length).toBe(DEMO_COMMUNITY_POSTS.length);
    expect(feed.total).toBe(DEMO_COMMUNITY_POSTS.length);

    const codes = feed.items.map((post) => post.shareCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("uses real catalog images and products", () => {
    for (const post of DEMO_COMMUNITY_POSTS) {
      expect(post.imageUrl).toMatch(/^https?:\/\//);
      expect(post.products.length).toBeGreaterThan(0);
      expect(post.brandNames.length).toBeGreaterThan(0);
      for (const product of post.products) {
        expect(product.productId).toMatch(/^[0-9a-f-]{36}$/);
        expect(product.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("sorts the feed newest first", () => {
    const feed = demoCommunity.feed(0, 24);
    const times = feed.items.map((post) => Date.parse(post.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("sorts the popular feed by likes", () => {
    const feed = demoCommunity.popularFeed(0, 24);
    const counts = feed.items.map((post) => post.likeCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it("paginates without overlapping", () => {
    const first = demoCommunity.feed(0, 5);
    const second = demoCommunity.feed(1, 5);
    expect(first.items).toHaveLength(5);
    expect(second.items).toHaveLength(5);
    const firstIds = first.items.map((post) => post.id);
    expect(second.items.every((post) => !firstIds.includes(post.id))).toBe(true);
  });

  it("looks up a post by share code", () => {
    const target = DEMO_COMMUNITY_POSTS[0];
    const found = demoCommunity.byShareCode(target.shareCode);
    expect(found?.id).toBe(target.id);
    expect(demoCommunity.byShareCode("khong-ton-tai")).toBeNull();
  });

  it("tracks likes locally", () => {
    const target = DEMO_COMMUNITY_POSTS[0];
    const before = target.likeCount;

    const liked = demoCommunity.toggleLike(target.id, true);
    expect(liked?.likeCount).toBe(before + 1);
    expect(liked?.likedByMe).toBe(true);

    const unliked = demoCommunity.toggleLike(target.id, false);
    expect(unliked?.likeCount).toBe(before);
    expect(unliked?.likedByMe).toBe(false);
  });

  it("tracks saves locally and lists them", () => {
    const target = DEMO_COMMUNITY_POSTS[1];
    demoCommunity.toggleSave(target.id, true);

    const saved = demoCommunity.saved(0, 24);
    expect(saved.items.map((post) => post.id)).toContain(target.id);

    demoCommunity.toggleSave(target.id, false);
    expect(demoCommunity.saved(0, 24).items).toHaveLength(0);
  });

  it("exposes a profile summary", () => {
    const profile = demoCommunity.profile();
    expect(profile.publishedPosts).toBe(DEMO_COMMUNITY_POSTS.length);
    expect(profile.totalLikesReceived).toBeGreaterThan(0);
  });
});
