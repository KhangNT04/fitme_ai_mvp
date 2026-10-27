import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationBell } from "./NotificationBell";
import { communityApi } from "@/services/community-api";
import { useAuthStore } from "@/stores/auth-store";

vi.mock("@/services/community-api", () => ({
  communityApi: {
    getNotifications: vi.fn(),
  },
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

function renderBell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
    mockedApi.getNotifications.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is hidden for a guest", () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    renderBell();
    expect(screen.queryByRole("button", { name: /Thông báo/ })).not.toBeInTheDocument();
  });

  it("shows the count of unread notifications on the bell", async () => {
    mockedApi.getNotifications.mockResolvedValue([
      {
        id: "n-1",
        postId: "post-1",
        postShareCode: "abc1234567",
        postTitle: "Outfit của tôi",
        actorDisplayName: "Mai Anh",
        actorInitials: "MA",
        content: "Outfit này hợp quá",
        reply: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    renderBell();

    await waitFor(() => expect(mockedApi.getNotifications).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: /Thông báo \(1 mới\)/ })).toBeInTheDocument();
  });

  it("lists the notifications when the bell is opened", async () => {
    mockedApi.getNotifications.mockResolvedValue([
      {
        id: "n-1",
        postId: "post-1",
        postShareCode: "abc1234567",
        postTitle: "Outfit của tôi",
        actorDisplayName: "Mai Anh",
        actorInitials: "MA",
        content: "Outfit này hợp quá",
        reply: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Thông báo/ }));
    expect(await screen.findByText(/Mai Anh/)).toBeInTheDocument();
    expect(screen.getByText("Outfit này hợp quá")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mai Anh/ })).toHaveAttribute(
      "href",
      "/outfit/abc1234567",
    );
  });

  it("says so when there is nothing to show", async () => {
    renderBell();

    fireEvent.click(await screen.findByRole("button", { name: /Thông báo/ }));
    expect(await screen.findByText(/Chưa có thông báo nào/)).toBeInTheDocument();
  });
});
