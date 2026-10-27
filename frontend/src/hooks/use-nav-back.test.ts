import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNavBack } from "./use-nav-back";
import { recordNavVisit, NAV_HISTORY_STORAGE_KEY } from "@/lib/nav-history";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("useNavBack", () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockClear();
  });

  it("keeps the fallback label when there is no in-app history", () => {
    recordNavVisit("/discover");
    const { result } = renderHook(() => useNavBack({ href: "/", label: "Trang chủ" }));

    expect(result.current.fromHistory).toBe(false);
    expect(result.current.label).toBe("Trang chủ");
    expect(result.current.href).toBe("/");
  });

  it("resolves the previous route and a short label from the nav history", () => {
    recordNavVisit("/community");
    recordNavVisit("/discover");

    const { result } = renderHook(() => useNavBack({ href: "/", label: "Trang chủ" }));

    expect(result.current.fromHistory).toBe(true);
    expect(result.current.href).toBe("/community");
    // Short label, not the full "Cộng đồng thời trang" page title.
    expect(result.current.label).toBe("Cộng đồng");
  });

  it("ignores history when disableHistory is set", () => {
    recordNavVisit("/community");
    recordNavVisit("/discover");

    const { result } = renderHook(() =>
      useNavBack({ href: "/", label: "Trang chủ" }, { disableHistory: true }),
    );

    expect(result.current.fromHistory).toBe(false);
    expect(result.current.href).toBe("/");
    expect(result.current.label).toBe("Trang chủ");
  });

  it("navigates back through history instead of following the fallback href", () => {
    recordNavVisit("/community");
    recordNavVisit("/discover");

    const { result } = renderHook(() => useNavBack({ href: "/", label: "Trang chủ" }));
    const preventDefault = vi.fn();
    act(() => {
      result.current.navigateBack({ preventDefault });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/community");
    expect(JSON.parse(sessionStorage.getItem(NAV_HISTORY_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });
});
