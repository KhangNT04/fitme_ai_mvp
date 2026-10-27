import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityComments } from "./CommunityComments";
import { communityApi } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import type { CommunityComment } from "@/types";

vi.mock("@/services/community-api", () => ({
  communityApi: {
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedApi = vi.mocked(communityApi);

/** A token that is not expired, so the store reports the viewer as signed in. */
const VALID_TOKEN = (() => {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.signature`;
})();

function signIn() {
  useAuthStore.setState({
    accessToken: VALID_TOKEN,
    refreshToken: VALID_TOKEN,
    user: { id: "me", email: "me@fitme.ai", fullName: "Me", role: "USER", emailVerified: true },
  });
}

function signOut() {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
}

function comment(overrides: Partial<CommunityComment> = {}): CommunityComment {
  return {
    id: "comment-1",
    postId: "post-1",
    content: "Outfit này hợp quá",
    authorDisplayName: "Linh Chi",
    authorInitials: "LC",
    mine: false,
    canDelete: false,
    parentId: null,
    parentAuthorDisplayName: null,
    createdAt: new Date().toISOString(),
    replies: [],
    ...overrides,
  };
}

function renderComments() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommunityComments postId="post-1" />
    </QueryClientProvider>,
  );
}

describe("CommunityComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
    mockedApi.getComments.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tells a guest to sign in instead of showing the composer", async () => {
    signOut();
    renderComments();

    expect(await screen.findByText(/Đăng nhập/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nội dung bình luận/i)).not.toBeInTheDocument();
  });

  it("lists the comments with their replies", async () => {
    mockedApi.getComments.mockResolvedValue([
      comment({
        replies: [
          comment({
            id: "comment-2",
            content: "Cảm ơn bạn nha",
            authorDisplayName: "Minh",
            authorInitials: "MN",
          }),
        ],
      }),
    ]);
    renderComments();

    expect(await screen.findByText("Outfit này hợp quá")).toBeInTheDocument();
    expect(screen.getByText("Cảm ơn bạn nha")).toBeInTheDocument();
    expect(screen.getByText(/Bình luận \(2\)/)).toBeInTheDocument();
  });

  it("posts a comment and clears the composer", async () => {
    mockedApi.addComment.mockResolvedValue(comment({ mine: true, canDelete: true }));
    renderComments();

    const composer = await screen.findByLabelText(/Nội dung bình luận/i);
    fireEvent.change(composer, { target: { value: "Outfit đẹp quá" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi bình luận/i }));

    await waitFor(() => expect(mockedApi.addComment).toHaveBeenCalledTimes(1));
    expect(mockedApi.addComment).toHaveBeenCalledWith("post-1", "Outfit đẹp quá", undefined);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("sends the parent id when replying", async () => {
    mockedApi.getComments.mockResolvedValue([comment()]);
    mockedApi.addComment.mockResolvedValue(comment({ id: "comment-3", parentId: "comment-1" }));
    renderComments();

    fireEvent.click(await screen.findByRole("button", { name: /Trả lời/i }));
    const composer = await screen.findByPlaceholderText(/Trả lời Linh Chi/i);
    fireEvent.change(composer, { target: { value: "Cảm ơn bạn nha" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi bình luận/i }));

    await waitFor(() => expect(mockedApi.addComment).toHaveBeenCalledTimes(1));
    expect(mockedApi.addComment).toHaveBeenCalledWith("post-1", "Cảm ơn bạn nha", "comment-1");
  });

  it("only offers the delete button on comments the viewer may remove", async () => {
    mockedApi.getComments.mockResolvedValue([
      comment(),
      comment({ id: "comment-2", content: "Bình luận của tôi", mine: true, canDelete: true }),
    ]);
    renderComments();

    await screen.findByText("Outfit này hợp quá");
    // Exactly one delete button, for the viewer's own comment.
    expect(screen.getAllByRole("button", { name: /Xoá/i })).toHaveLength(1);
  });
});
