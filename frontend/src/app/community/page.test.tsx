import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityPostCard } from "./page";
import { communityApi } from "@/services/community-api";
import type { CommunityPost } from "@/types";

vi.mock("@/services/community-api", () => ({
  communityApi: {
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

vi.mock("@/components/common/AppImage", () => ({
  AppImage: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const mockedApi = vi.mocked(communityApi);

function post(overrides: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id: "post-1",
    shareCode: "a1b2c3d4",
    shareUrl: "/outfit/a1b2c3d4",
    title: "Áo thun oversize",
    caption: "Phối đồ đi học đi chơi đều ổn",
    styleLabel: "Korean Casual",
    occasion: null,
    imageUrl: "https://cdn.example/outfit.jpg",
    authorDisplayName: "Linh Chi",
    authorInitials: "LC",
    brandNames: ["Teelab"],
    products: [],
    likeCount: 47,
    commentCount: 5,
    viewCount: 318,
    likedByMe: false,
    savedByMe: false,
    mine: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderCard(target: CommunityPost) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommunityPostCard
        post={target}
        canInteract
        onLike={() => {}}
        onSave={() => {}}
      />
    </QueryClientProvider>,
  );
}

describe("CommunityPostCard comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getComments.mockResolvedValue([]);
  });

  it("does not load the thread until the reader asks for it", () => {
    renderCard(post());

    expect(mockedApi.getComments).not.toHaveBeenCalled();
    expect(screen.queryByText(/Chưa có bình luận nào/i)).not.toBeInTheDocument();
  });

  it("opens a comment modal when the comment button is clicked", async () => {
    renderCard(post());

    fireEvent.click(screen.getByRole("button", { name: /Bình luận/i }));

    expect(await screen.findByText(/Chưa có bình luận nào/i)).toBeInTheDocument();
    await waitFor(() => expect(mockedApi.getComments).toHaveBeenCalledWith("post-1"));
  });

  it("keeps the discussion out of the card itself", () => {
    renderCard(post());

    // The card only shows the summary line, never the thread.
    expect(screen.getByText("5 bình luận")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nội dung bình luận/i)).not.toBeInTheDocument();
  });
});
