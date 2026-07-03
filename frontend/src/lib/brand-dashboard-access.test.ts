import { describe, expect, it } from "vitest";
import { getBrandDashboardBlockReason } from "./brand-dashboard-access";
import type { BrandBillingSummary } from "@/types/billing";

function summary(overrides: Partial<BrandBillingSummary>): BrandBillingSummary {
  return {
    brandId: "brand-1",
    subscriptionRemaining: 0,
    topupRemaining: 0,
    totalRemaining: 0,
    dashboardEnabled: false,
    recentOrders: [],
    ...overrides,
  };
}

describe("getBrandDashboardBlockReason", () => {
  it("returns null when dashboard is enabled", () => {
    expect(
      getBrandDashboardBlockReason(summary({ dashboardEnabled: true })),
    ).toBeNull();
  });

  it("explains missing subscription", () => {
    const reason = getBrandDashboardBlockReason(summary({}));
    expect(reason?.title).toBe("Chưa có gói tháng");
  });

  it("explains top-up only access", () => {
    const reason = getBrandDashboardBlockReason(
      summary({ totalRemaining: 150, topupRemaining: 150 }),
    );
    expect(reason?.title).toBe("Gói top-up không bao gồm dashboard");
  });

  it("explains expired subscription", () => {
    const reason = getBrandDashboardBlockReason(
      summary({
        subscription: {
          planId: "p1",
          planName: "Growth",
          status: "EXPIRED",
          startsAt: "2026-01-01T00:00:00Z",
          expiresAt: "2026-02-01T00:00:00Z",
        },
      }),
    );
    expect(reason?.title).toBe("Gói tháng đã hết hạn");
    expect(reason?.message).toContain("Growth");
  });
});
