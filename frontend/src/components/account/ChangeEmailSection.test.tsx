import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChangeEmailSection } from "./ChangeEmailSection";
import { accountEmailApi } from "@/services/account-email-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

vi.mock("@/services/account-email-api", () => ({
  accountEmailApi: {
    getStatus: vi.fn(),
    requestChange: vi.fn(),
    confirmChange: vi.fn(),
    cancelChange: vi.fn(),
  },
}));

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockedApi = vi.mocked(accountEmailApi);

/** setAuth() đồng bộ phiên qua fetch tới /api/auth/session — jsdom không có backend. */
function mockPortalSession() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  );
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChangeEmailSection />
    </QueryClientProvider>,
  );
}

describe("ChangeEmailSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortalSession();
    mockedApi.getStatus.mockResolvedValue({
      pendingEmail: null,
      requestedAt: null,
      expiresAt: null,
      pending: false,
    });
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "old@example.com",
        fullName: "Test User",
        role: "USER",
        emailVerified: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the current email and opens the change dialog", async () => {
    renderSection();

    expect(await screen.findByText("old@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Đổi email/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email đăng nhập mới/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu hiện tại/i)).toBeInTheDocument();
  });

  it("keeps the send button disabled until the email and the password are filled in", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Đổi email/i }));
    const send = await screen.findByRole("button", { name: /Gửi mã xác minh/i });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Email đăng nhập mới/i), {
      target: { value: "new@example.com" },
    });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), {
      target: { value: "secret123" },
    });
    expect(send).not.toBeDisabled();
  });

  it("sends the password and the new email, then asks for the code", async () => {
    mockedApi.requestChange.mockResolvedValue({
      pendingEmail: "new@example.com",
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      pending: true,
    });
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Đổi email/i }));
    fireEvent.change(await screen.findByLabelText(/Email đăng nhập mới/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi mã xác minh/i }));

    await waitFor(() => expect(mockedApi.requestChange).toHaveBeenCalledTimes(1));
    expect(mockedApi.requestChange).toHaveBeenCalledWith("secret123", "new@example.com");
    expect(toast.success).toHaveBeenCalled();

    // Bước 2: nhập mã 6 số.
    const confirm = await screen.findByRole("button", { name: /Xác nhận & đổi email/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Mã xác minh/i), { target: { value: "123456" } });
    expect(confirm).not.toBeDisabled();
  });

  it("confirms the code and refreshes the session", async () => {
    mockedApi.requestChange.mockResolvedValue({
      pendingEmail: "new@example.com",
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      pending: true,
    });
    mockedApi.confirmChange.mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      user: {
        id: "user-1",
        email: "new@example.com",
        fullName: "Test User",
        role: "USER",
        emailVerified: true,
      },
    });
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Đổi email/i }));
    fireEvent.change(await screen.findByLabelText(/Email đăng nhập mới/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Gửi mã xác minh/i }));

    fireEvent.change(await screen.findByLabelText(/Mã xác minh/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận & đổi email/i }));

    await waitFor(() => expect(mockedApi.confirmChange).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(useAuthStore.getState().user?.email).toBe("new@example.com"));
  });

  it("shows the pending banner with a cancel action", async () => {
    mockedApi.getStatus.mockResolvedValue({
      pendingEmail: "pending@example.com",
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      pending: true,
    });
    mockedApi.cancelChange.mockResolvedValue({
      pendingEmail: null,
      requestedAt: null,
      expiresAt: null,
      pending: false,
    });
    renderSection();

    const banner = await screen.findByTestId("email-change-pending");
    expect(banner).toHaveTextContent("Đang chờ xác minh email mới");
    expect(banner).toHaveTextContent("pending@example.com");

    fireEvent.click(screen.getByRole("button", { name: /Huỷ đổi email/i }));

    await waitFor(() => expect(mockedApi.cancelChange).toHaveBeenCalledTimes(1));
  });
});
