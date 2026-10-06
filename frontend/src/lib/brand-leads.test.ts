import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAD_FILTERS,
  funnelSteps,
  leadCustomer,
  leadDateRangeError,
  leadQueryParams,
  leadVariantLabel,
  withLeadSold,
} from "./brand-leads";
import type { BrandLead, BrandLeadPage } from "@/types/brand-lead";

function lead(overrides: Partial<BrandLead>): BrandLead {
  return {
    id: "lead-1",
    productId: "p-1",
    productName: "Áo thun",
    customerName: "Lan",
    customerEmail: "lan@example.com",
    customerStatus: "VISIBLE",
    size: "M",
    color: "Đen",
    createdAt: "2026-10-01T03:00:00Z",
    confirmedSoldAt: null,
    ...overrides,
  };
}

function page(items: BrandLead[], sold = 0): BrandLeadPage {
  return {
    plusRequired: false,
    summary: { total: items.length, sold, last30Days: items.length },
    items,
    page: 0,
    size: 20,
    totalItems: items.length,
    totalPages: 1,
  };
}

describe("leadQueryParams", () => {
  it("only sends the filters that are set", () => {
    expect(leadQueryParams(DEFAULT_LEAD_FILTERS)).toEqual({ page: 0, size: 20 });
    expect(
      leadQueryParams({ from: "2026-10-01", to: "2026-10-07", productId: "p-1", sold: "unsold", page: 2 }, 50),
    ).toEqual({ page: 2, size: 50, from: "2026-10-01", to: "2026-10-07", productId: "p-1", sold: false });
    expect(leadQueryParams({ ...DEFAULT_LEAD_FILTERS, sold: "sold", page: -1 })).toEqual({
      page: 0,
      size: 20,
      sold: true,
    });
  });
});

describe("leadDateRangeError", () => {
  it("rejects a start date after the end date", () => {
    expect(leadDateRangeError("2026-10-08", "2026-10-07")).not.toBeNull();
    expect(leadDateRangeError("2026-10-07", "2026-10-07")).toBeNull();
    expect(leadDateRangeError("", "2026-10-07")).toBeNull();
  });
});

describe("leadCustomer", () => {
  it("shows name and email only while the customer still consents", () => {
    expect(leadCustomer(lead({}))).toEqual({ name: "Lan", email: "lan@example.com", hidden: false });
    expect(leadCustomer(lead({ customerName: " " }))).toMatchObject({ name: "Khách hàng FitMe" });
    expect(leadCustomer(lead({ customerStatus: "WITHDRAWN", customerName: null, customerEmail: null }))).toEqual({
      name: "Khách đã rút đồng ý",
      email: null,
      hidden: true,
    });
    expect(leadCustomer(lead({ customerStatus: "ANONYMIZED" }))).toMatchObject({ email: null, hidden: true });
  });
});

describe("leadVariantLabel", () => {
  it("joins size and colour", () => {
    expect(leadVariantLabel({ size: "M", color: "Đen" })).toBe("M · Đen");
    expect(leadVariantLabel({ size: null, color: "Đen" })).toBe("Đen");
    expect(leadVariantLabel({ size: "", color: null })).toBe("—");
  });
});

describe("withLeadSold", () => {
  it("toggles one row and keeps the sold count in step", () => {
    const before = page([lead({}), lead({ id: "lead-2" })]);
    const sold = withLeadSold(before, "lead-1", "2026-10-07T00:00:00Z");
    expect(sold.items[0].confirmedSoldAt).toBe("2026-10-07T00:00:00Z");
    expect(sold.items[1]).toBe(before.items[1]);
    expect(sold.summary.sold).toBe(1);

    expect(withLeadSold(sold, "lead-1", "2026-10-08T00:00:00Z").items[0].confirmedSoldAt).toBe(
      "2026-10-07T00:00:00Z",
    );
    expect(withLeadSold(sold, "lead-1", "2026-10-08T00:00:00Z").summary.sold).toBe(1);

    const unsold = withLeadSold(sold, "lead-1", null);
    expect(unsold.items[0].confirmedSoldAt).toBeNull();
    expect(unsold.summary.sold).toBe(0);
    expect(withLeadSold(unsold, "missing", null)).toEqual(unsold);
  });
});

describe("funnelSteps", () => {
  it("rates each step against the previous one", () => {
    expect(funnelSteps({ tryOnCustomers: 10, buyClickCustomers: 4, soldLeads: 1 })).toEqual([
      { label: "Khách thử đồ", value: 10, rate: null },
      { label: "Khách bấm mua", value: 4, rate: 0.4 },
      { label: "Đơn brand xác nhận đã bán", value: 1, rate: 0.25 },
    ]);
    expect(funnelSteps({ tryOnCustomers: 1, buyClickCustomers: 3, soldLeads: 0 })[1].rate).toBe(1);
    expect(funnelSteps(undefined).map((s) => s.rate)).toEqual([null, null, null]);
  });
});
