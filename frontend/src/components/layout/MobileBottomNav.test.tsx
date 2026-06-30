import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MobileBottomNav } from "./MobileBottomNav";

const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();
const mockUseAuthStore = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    mockUseAuthStore(selector),
}));

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    mockUsePathname.mockReturnValue("/discover");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: "token" })
    );
  });

  it("renders five tabs on discover", () => {
    mockUsePathname.mockReturnValue("/discover");
    render(<MobileBottomNav />);

    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Trang chủ/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Khám phá/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Tư vấn AI/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Thử mặc/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hồ sơ/i })).toBeInTheDocument();
  });

  it("does not render on auth routes", () => {
    mockUsePathname.mockReturnValue("/auth/login");
    const { container } = render(<MobileBottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("links profile to login when unauthenticated", () => {
    mockUsePathname.mockReturnValue("/discover");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: null })
    );
    render(<MobileBottomNav />);
    expect(screen.getByRole("link", { name: /Hồ sơ/i })).toHaveAttribute(
      "href",
      "/auth/login?redirect=%2Fprofile"
    );
  });

  it("highlights try-on tab for product detail opened from try-on flow", () => {
    mockUsePathname.mockReturnValue("/products/abc");
    mockUseSearchParams.mockReturnValue(new URLSearchParams("from=try-on"));
    render(<MobileBottomNav />);
    expect(screen.getByRole("link", { name: /Thử mặc/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Khám phá/i })).not.toHaveAttribute("aria-current");
  });

  it("scrolls to top when tapping the active tab on the same route", () => {
    mockUsePathname.mockReturnValue("/try-on");
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByRole("link", { name: /Thử mặc/i }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });
  });
});
