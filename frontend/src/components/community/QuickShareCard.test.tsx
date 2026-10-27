import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuickShareCard } from "./QuickShareCard";
import { communityApi } from "@/services/community-api";
import { galleryApi } from "@/services/gallery-api";
import { privacyApi } from "@/services/privacy-api";
import { rewardsApi } from "@/services/rewards-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

vi.mock("@/services/community-api", () => ({
  communityApi: { createPost: vi.fn() },
}));

vi.mock("@/services/gallery-api", () => ({
  galleryApi: { getImages: vi.fn() },
}));

vi.mock("@/services/privacy-api", () => ({
  PRIVACY_CONSENTS_QUERY_KEY: ["privacy-consents"],
  privacyApi: { getConsents: vi.fn(), recordConsent: vi.fn() },
}));

vi.mock("@/services/rewards-api", () => ({
  rewardsApi: { getSummary: vi.fn(), claimShare: vi.fn() },
}));

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedCommunity = vi.mocked(communityApi);
const mockedGallery = vi.mocked(galleryApi);
const mockedPrivacy = vi.mocked(privacyApi);
const mockedRewards = vi.mocked(rewardsApi);

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

function galleryItem(id: string) {
  return {
    id,
    imageUrl: `https://cdn.example/${id}.jpg`,
    tryOnRequestId: "req-1",
    previewSource: "VTON",
    products: [],
    createdAt: new Date().toISOString(),
  } as never;
}

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuickShareCard />
    </QueryClientProvider>,
  );
}

describe("QuickShareCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
    mockedGallery.getImages.mockResolvedValue({
      items: [galleryItem("g-1"), galleryItem("g-2")],
      page: 0,
      size: 12,
      total: 2,
    });
    mockedPrivacy.getConsents.mockResolvedValue({ COMMUNITY_SHARE: true });
    mockedRewards.getSummary.mockResolvedValue({
      balance: 5,
      maxBalance: 100,
      checkin: {
        checkedInToday: false,
        currentStreak: 0,
        rewardGranted: 0,
        balance: 5,
      },
      share: {
        rewardAmount: 3,
        dailyLimit: 1,
        remainingToday: 1,
        allowedDomains: [],
        recentClaims: [],
      },
      review: {
        rewardAmount: 2,
        minContentLength: 20,
        rewardedCount: 0,
        dailyLimit: 1,
        remainingToday: 1,
      },
    } as never);
  });

  it("asks guests to sign in instead of listing photos", async () => {
    signOut();
    renderCard();

    expect(screen.getByText(/Đăng nhập/i)).toBeInTheDocument();
    expect(mockedGallery.getImages).not.toHaveBeenCalled();
  });

  it("lists the reader's own try-on photos", async () => {
    renderCard();

    expect(await screen.findByLabelText("Chọn ảnh g-1")).toBeInTheDocument();
    expect(screen.getByLabelText("Chọn ảnh g-2")).toBeInTheDocument();
  });

  it("publishes the picked photo with the title and caption the user wrote", async () => {
    mockedCommunity.createPost.mockResolvedValue({
      post: { id: "p-1", shareCode: "abc" },
      shareUrl: "/outfit/abc",
    } as never);
    renderCard();

    fireEvent.click(await screen.findByLabelText("Chọn ảnh g-1"));

    // The composer lets the user write the post before it goes live.
    const titleInput = await screen.findByLabelText(/Tiêu đề \(không bắt buộc\)/i);
    fireEvent.change(titleInput, { target: { value: "Outfit đi học" } });
    const captionInput = screen.getByLabelText(/Mô tả \(không bắt buộc\)/i);
    fireEvent.change(captionInput, { target: { value: "Áo thun rộng dễ mặc" } });

    fireEvent.click(screen.getByRole("button", { name: /Đăng lên cộng đồng/i }));

    await waitFor(() =>
      expect(mockedCommunity.createPost).toHaveBeenCalledWith({
        galleryImageId: "g-1",
        title: "Outfit đi học",
        caption: "Áo thun rộng dễ mặc",
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("offers the public link and the reward once the post is live", async () => {
    mockedCommunity.createPost.mockResolvedValue({
      post: { id: "p-1", shareCode: "abc" },
      shareUrl: "/outfit/abc",
    } as never);
    renderCard();

    fireEvent.click(await screen.findByLabelText("Chọn ảnh g-1"));
    fireEvent.click(await screen.findByRole("button", { name: /Đăng lên cộng đồng/i }));

    expect(await screen.findByText(/Đã chia sẻ công khai/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Nhận 3 Fitken/i })).toBeInTheDocument();
  });

  it("asks for the community consent before showing the composer", async () => {
    mockedPrivacy.getConsents.mockResolvedValue({ COMMUNITY_SHARE: false });
    renderCard();

    fireEvent.click(await screen.findByLabelText("Chọn ảnh g-1"));

    expect(await screen.findByRole("button", { name: /Cho phép chia sẻ/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Tiêu đề \(không bắt buộc\)/i)).not.toBeInTheDocument();
  });

  it("cannot publish before a photo is picked", async () => {
    renderCard();

    await screen.findByLabelText("Chọn ảnh g-1");
    expect(screen.getByRole("button", { name: /Chọn ảnh để đăng/i })).toBeDisabled();
  });

  it("points to the try-on flow when the gallery is empty", async () => {
    mockedGallery.getImages.mockResolvedValue({ items: [], page: 0, size: 12, total: 0 });
    renderCard();

    expect(await screen.findByText(/chưa có ảnh thử mặc nào/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Thử đồ ngay/i })).toHaveAttribute("href", "/try-on");
  });
});
