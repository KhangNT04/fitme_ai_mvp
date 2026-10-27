import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuickShareDialog } from "./QuickShareDialog";
import { galleryApi } from "@/services/gallery-api";
import { useAuthStore } from "@/stores/auth-store";

vi.mock("@/services/gallery-api", () => ({
  galleryApi: { getImages: vi.fn() },
}));

vi.mock("@/services/community-api", () => ({
  communityApi: { createPost: vi.fn() },
}));

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuickShareDialog />
    </QueryClientProvider>,
  );
}

describe("QuickShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
    vi.mocked(galleryApi.getImages).mockResolvedValue({
      items: [
        {
          id: "g-1",
          imageUrl: "https://cdn.example/g-1.jpg",
          tryOnRequestId: "req-1",
          previewSource: "VTON",
          products: [],
          createdAt: new Date().toISOString(),
        },
      ],
      page: 0,
      size: 12,
      total: 1,
    } as never);
  });

  it("opens the dialog from the trigger", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Chia sẻ nhanh/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the title and hint exactly once inside the dialog", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Chia sẻ nhanh/i }));

    const dialog = within(screen.getByRole("dialog"));
    // The card inside must not repeat the heading or the hint.
    expect(dialog.getAllByText("Chia sẻ nhanh")).toHaveLength(1);
    expect(dialog.getAllByText(/Chọn ảnh thử mặc của bạn để đăng ngay lên cộng đồng/i)).toHaveLength(1);
  });

  it("does not repeat the card header inside the dialog", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Chia sẻ nhanh/i }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.queryByText(/Chọn ảnh thử mặc để đăng ngay lên cộng đồng/i)).not.toBeInTheDocument();
  });
});
