import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityPostDeleteButton } from "./CommunityPostDeleteButton";
import { communityApi } from "@/services/community-api";
import { toast } from "@/stores/toast-store";

vi.mock("@/services/community-api", () => ({
  communityApi: { deletePost: vi.fn() },
}));

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedCommunity = vi.mocked(communityApi);

function renderButton(onDeleted?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommunityPostDeleteButton postId="p-1" onDeleted={onDeleted} />
    </QueryClientProvider>,
  );
}

describe("CommunityPostDeleteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for a confirmation before removing the post", async () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /Xoá bài/i }));

    expect(await screen.findByText(/Gỡ bài đăng\?/i)).toBeInTheDocument();
    expect(mockedCommunity.deletePost).not.toHaveBeenCalled();
  });

  it("keeps the post when the user backs out", async () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /Xoá bài/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Giữ lại/i }));

    await waitFor(() => expect(screen.queryByText(/Gỡ bài đăng\?/i)).not.toBeInTheDocument());
    expect(mockedCommunity.deletePost).not.toHaveBeenCalled();
  });

  it("removes the post and tells the caller once it is gone", async () => {
    mockedCommunity.deletePost.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    renderButton(onDeleted);

    fireEvent.click(screen.getByRole("button", { name: /Xoá bài/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Gỡ bài đăng/i }));

    await waitFor(() => expect(mockedCommunity.deletePost).toHaveBeenCalledWith("p-1"));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });
});
