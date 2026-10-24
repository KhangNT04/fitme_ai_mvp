import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PricingLink } from "./PricingLink";
import apiClient from "@/services/api-client";

vi.mock("@/services/api-client", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  unwrap: (res: { data?: unknown }) => {
    const data = res?.data as { data?: unknown } | undefined;
    if (data && typeof data === "object" && "data" in data) return data.data;
    return data;
  },
}));

const mockedGet = vi.mocked(apiClient.get);

function renderLink() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PricingLink href="/pricing">Nâng cấp Premium</PricingLink>
    </QueryClientProvider>,
  );
}

describe("PricingLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the upgrade link when the paid plans are visible", async () => {
    mockedGet.mockResolvedValue({ data: { showPaid: true } } as never);

    renderLink();

    const link = await screen.findByRole("link", { name: /Nâng cấp Premium/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });

  it("hides the upgrade link when the admin hid the paid plans", async () => {
    mockedGet.mockResolvedValue({ data: { showPaid: false } } as never);

    renderLink();

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("link")).not.toBeInTheDocument());
  });
});
