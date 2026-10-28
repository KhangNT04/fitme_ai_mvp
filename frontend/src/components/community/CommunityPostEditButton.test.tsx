import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityPostEditButton } from "./CommunityPostEditButton";
import { communityApi } from "@/services/community-api";
import { toast } from "@/stores/toast-store";
import type { CommunityPost } from "@/types";

vi.mock("@/services/community-api", () => ({
  communityApi: { updatePost: vi.fn() },
}));

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedCommunity = vi.mocked(communityApi);

function post(overrides: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id: "p-1",
    shareCode: "a1b2c3d4",
    shareUrl: "/outfit/a1b2c3d4",
    title: "Tiêu đề cũ",
    caption: "Mô tả cũ",
    styleLabel: "Minimal",
    occasion: null,
    imageUrl: "https://cdn.example/outfit.jpg",
    authorDisplayName: "Linh Chi",
    authorInitials: "LC",
    brandNames: [],
    products: [],
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    likedByMe: false,
    savedByMe: false,
    mine: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderButton(target: CommunityPost = post(), onUpdated?: (p: CommunityPost) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommunityPostEditButton post={target} onUpdated={onUpdated} />
    </QueryClientProvider>,
  );
}

describe("CommunityPostEditButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the editor with the current words of the post", async () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /Sửa/i }));

    const title = await screen.findByDisplayValue("Tiêu đề cũ");
    expect(title).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mô tả cũ")).toBeInTheDocument();
  });

  it("saves the new words and tells the caller", async () => {
    mockedCommunity.updatePost.mockResolvedValue(
      post({ title: "Tiêu đề mới", caption: "Mô tả mới" }),
    );
    const onUpdated = vi.fn();
    renderButton(post(), onUpdated);

    fireEvent.click(screen.getByRole("button", { name: /Sửa/i }));

    const title = await screen.findByDisplayValue("Tiêu đề cũ");
    fireEvent.change(title, { target: { value: "Tiêu đề mới" } });
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/i }));

    await waitFor(() =>
      expect(mockedCommunity.updatePost).toHaveBeenCalledWith("p-1", {
        title: "Tiêu đề mới",
        caption: "Mô tả cũ",
      }),
    );
    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("leaves the post alone when the editor is closed", async () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /Sửa/i }));
    const title = await screen.findByDisplayValue("Tiêu đề cũ");
    fireEvent.change(title, { target: { value: "Tiêu đề mới" } });
    fireEvent.click(screen.getByRole("button", { name: /Huỷ/i }));

    await waitFor(() => expect(screen.queryByDisplayValue("Tiêu đề mới")).not.toBeInTheDocument());
    expect(mockedCommunity.updatePost).not.toHaveBeenCalled();
  });

  it("tells the user when the update fails", async () => {
    mockedCommunity.updatePost.mockRejectedValue({ message: "Không thể cập nhật" });
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /Sửa/i }));
    await screen.findByDisplayValue("Tiêu đề cũ");
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
