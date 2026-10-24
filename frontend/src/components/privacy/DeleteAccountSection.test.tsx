import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeleteAccountSection, DELETE_CONFIRMATION_PHRASE } from "./DeleteAccountSection";
import { accountDeletionApi } from "@/services/privacy-api";
import { toast } from "@/stores/toast-store";

vi.mock("@/services/privacy-api", () => ({
  ACCOUNT_DELETION_QUERY_KEY: ["account-deletion-status"],
  accountDeletionApi: {
    getStatus: vi.fn(),
    requestDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
  },
}));

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedApi = vi.mocked(accountDeletionApi);

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DeleteAccountSection />
    </QueryClientProvider>,
  );
}

describe("DeleteAccountSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getStatus.mockResolvedValue({
      requestId: null,
      status: null,
      requestedAt: null,
      scheduledFor: null,
      daysRemaining: null,
      reason: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the delete button and opens a confirmation dialog", async () => {
    renderSection();

    const trigger = await screen.findByRole("button", { name: /Xoá tài khoản của tôi/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Xoá tài khoản của bạn?")).toBeInTheDocument();
    // Cảnh báo dữ liệu sẽ mất.
    expect(screen.getByText(/Toàn bộ dữ liệu cá nhân sẽ bị xoá/i)).toBeInTheDocument();
  });

  it("keeps the confirm button disabled until the password and phrase are filled in", async () => {
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: /Xoá tài khoản của tôi/i }));
    const confirm = await screen.findByRole("button", { name: /Xác nhận xoá tài khoản/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), { target: { value: "secret123" } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(new RegExp(DELETE_CONFIRMATION_PHRASE)), {
      target: { value: "SAI" },
    });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(new RegExp(DELETE_CONFIRMATION_PHRASE)), {
      target: { value: DELETE_CONFIRMATION_PHRASE },
    });
    expect(confirm).not.toBeDisabled();
  });

  it("sends the password, the grace period and the reason", async () => {
    mockedApi.requestDeletion.mockResolvedValue({
      requestId: "req-1",
      status: "PENDING",
      requestedAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      daysRemaining: 7,
      reason: "không còn dùng",
    });
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: /Xoá tài khoản của tôi/i }));
    fireEvent.change(await screen.findByLabelText(/Mật khẩu hiện tại/i), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(DELETE_CONFIRMATION_PHRASE)), {
      target: { value: DELETE_CONFIRMATION_PHRASE },
    });
    fireEvent.change(screen.getByLabelText(/Lý do rời bỏ/i), {
      target: { value: "không còn dùng" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận xoá tài khoản/i }));

    await waitFor(() => expect(mockedApi.requestDeletion).toHaveBeenCalledTimes(1));
    expect(mockedApi.requestDeletion).toHaveBeenCalledWith({
      currentPassword: "secret123",
      confirmationText: DELETE_CONFIRMATION_PHRASE,
      reason: "không còn dùng",
      gracePeriodDays: 7,
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows the pending banner with a cancel button instead of the trigger", async () => {
    mockedApi.getStatus.mockResolvedValue({
      requestId: "req-1",
      status: "PENDING",
      requestedAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      daysRemaining: 3,
      reason: null,
    });
    mockedApi.cancelDeletion.mockResolvedValue({
      requestId: "req-1",
      status: "CANCELLED",
      requestedAt: new Date().toISOString(),
      scheduledFor: null,
      daysRemaining: null,
      reason: null,
    });
    renderSection();

    const banner = await screen.findByTestId("account-deletion-pending");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("Tài khoản sắp được xoá");
    expect(screen.queryByRole("button", { name: /Xoá tài khoản của tôi/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Huỷ xoá tài khoản/i }));

    await waitFor(() => expect(mockedApi.cancelDeletion).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalled();
  });
});
