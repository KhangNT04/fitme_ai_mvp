import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityCommentsModal } from "./CommunityCommentsModal";
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
    caption: null,
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

function renderModal(target: CommunityPost) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommunityCommentsModal post={target} open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

describe("CommunityCommentsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getComments.mockResolvedValue([]);
  });

  it("summarises the post so the reader knows what they are discussing", () => {
    renderModal(post());

    expect(screen.getByText("Linh Chi")).toBeInTheDocument();
    expect(screen.getByText("Áo thun oversize")).toBeInTheDocument();
  });

  it("shows the comment count in the summary", () => {
    renderModal(post({ commentCount: 12 }));

    expect(screen.getByText("12 bình luận")).toBeInTheDocument();
  });

  it("links the post title to the public post page", () => {
    renderModal(post());

    const link = screen.getByRole("link", { name: "Áo thun oversize" });
    expect(link).toHaveAttribute("href", "/outfit/a1b2c3d4");
  });

  it("does not render the post image, which was cropping badly", () => {
    renderModal(post());

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Xem trang bài đăng/i })).not.toBeInTheDocument();
  });

  it("loads the comment thread for the post", async () => {
    renderModal(post());

    expect(await screen.findByText(/Chưa có bình luận nào/i)).toBeInTheDocument();
    expect(mockedApi.getComments).toHaveBeenCalledWith("post-1");
  });
});
