import { describe, expect, it } from "vitest";
import {
  availableCartItems,
  canCancelOrder,
  canPayOrder,
  cartItemVariantLabel,
  clampQuantity,
  computeFreeshipDiscount,
  computeOrderTotal,
  formatAddressLine,
  formatCommerceDate,
  orderTabToStatusParam,
  parseCommerceDate,
  parsePayosOrderCode,
  pickDefaultAddress,
  resolveCheckoutTarget,
  sellerAvailableActions,
  sumCartSubtotal,
  unavailableCartItems,
  validateAddressInput,
} from "./commerce-utils";
import type { Address, Cart, CartItem } from "@/types/commerce";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "i1",
    productId: "p1",
    variantId: "v1",
    name: "Áo",
    imageUrl: "",
    colorName: "Đen",
    sizeLabel: "M",
    unitPriceVnd: 100_000,
    quantity: 2,
    lineTotalVnd: 200_000,
    stockQuantity: 5,
    available: true,
    ...overrides,
  };
}

describe("clampQuantity", () => {
  it("clamps into [1, stock]", () => {
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(3, 5)).toBe(3);
    expect(clampQuantity(9, 5)).toBe(5);
  });

  it("returns 0 when out of stock and caps at 99", () => {
    expect(clampQuantity(1, 0)).toBe(0);
    expect(clampQuantity(500, 1000)).toBe(99);
    expect(clampQuantity(2, undefined)).toBe(2);
  });
});

describe("cart helpers", () => {
  const cart: Cart = {
    itemCount: 3,
    subtotalVnd: 300_000,
    groups: [
      {
        brandId: "b1",
        brandName: "Brand",
        subtotalVnd: 300_000,
        items: [item(), item({ id: "i2", available: false, quantity: 1, lineTotalVnd: 100_000, stockQuantity: 0 })],
      },
    ],
  };

  it("splits available / unavailable lines", () => {
    expect(availableCartItems(cart).map((i) => i.id)).toEqual(["i1"]);
    expect(unavailableCartItems(cart).map((i) => i.id)).toEqual(["i2"]);
    expect(availableCartItems(undefined)).toEqual([]);
  });

  it("sums subtotal and builds variant label", () => {
    expect(sumCartSubtotal(availableCartItems(cart))).toBe(200_000);
    expect(cartItemVariantLabel(item())).toBe("Đen / M");
    expect(cartItemVariantLabel({ colorName: null, sizeLabel: "L" })).toBe("L");
  });
});

describe("price helpers", () => {
  it("applies freeship discount capped by shipping fee", () => {
    expect(computeFreeshipDiscount(60_000, 30_000)).toBe(30_000);
    expect(computeFreeshipDiscount(30_000, 50_000)).toBe(30_000);
    expect(computeFreeshipDiscount(0, 30_000)).toBe(0);
  });

  it("computes total never below zero", () => {
    expect(computeOrderTotal(200_000, 30_000, 30_000)).toBe(200_000);
    expect(computeOrderTotal(0, 10_000, 50_000)).toBe(0);
  });
});

describe("order helpers", () => {
  it("maps tab to status param", () => {
    expect(orderTabToStatusParam("ALL")).toBeUndefined();
    expect(orderTabToStatusParam("CONFIRMED")).toBe("CONFIRMED");
  });

  it("allows cancel until shipping", () => {
    const o = { status: "CONFIRMED", paymentMethod: "COD" } as const;
    expect(canCancelOrder(o)).toBe(true);
    expect(canCancelOrder(o, [{ status: "PACKED" }])).toBe(true);
    expect(canCancelOrder(o, [{ status: "SHIPPING" }])).toBe(false);
    expect(canCancelOrder({ ...o, status: "CANCELLED" })).toBe(false);
    expect(canCancelOrder({ ...o, status: "COMPLETED" })).toBe(false);
  });

  it("allows retry pay only for pending PayOS orders", () => {
    expect(canPayOrder({ status: "PENDING_PAYMENT", paymentMethod: "PAYOS" })).toBe(true);
    expect(canPayOrder({ status: "PENDING_PAYMENT", paymentMethod: "COD" })).toBe(false);
    expect(canPayOrder({ status: "CONFIRMED", paymentMethod: "PAYOS" })).toBe(false);
  });

  it("formats address line skipping blanks", () => {
    expect(formatAddressLine({ street: "1 A", ward: "", district: "Q1", province: "HCM" })).toBe("1 A, Q1, HCM");
    expect(formatAddressLine(null)).toBe("");
  });
});

describe("addresses", () => {
  const base = {
    recipientName: "An",
    phone: "0901234567",
    province: "HCM",
    district: "Q1",
    ward: "P1",
    street: "1 A",
    isDefault: false,
  };

  it("validates required fields in Vietnamese", () => {
    expect(validateAddressInput(base)).toBeNull();
    expect(validateAddressInput({ ...base, recipientName: " " })).toMatch(/tên người nhận/);
    expect(validateAddressInput({ ...base, phone: "123" })).toMatch(/số điện thoại/i);
    expect(validateAddressInput({ ...base, phone: "+84901234567" })).toBeNull();
    expect(validateAddressInput({ ...base, street: "" })).toMatch(/đường/);
  });

  it("prefers the default address", () => {
    const list = [
      { ...base, id: "a1" },
      { ...base, id: "a2", isDefault: true },
    ] as Address[];
    expect(pickDefaultAddress(list)?.id).toBe("a2");
    expect(pickDefaultAddress([list[0]])?.id).toBe("a1");
    expect(pickDefaultAddress([])).toBeUndefined();
  });
});

describe("checkout redirect helpers", () => {
  it("treats mock PayOS path as internal", () => {
    expect(resolveCheckoutTarget("/orders/return?status=success&orderCode=1&mock=1")).toEqual({
      kind: "internal",
      url: "/orders/return?status=success&orderCode=1&mock=1",
    });
  });

  it("treats other hosts as external and rejects junk", () => {
    expect(resolveCheckoutTarget("https://pay.payos.vn/web/abc")).toEqual({
      kind: "external",
      url: "https://pay.payos.vn/web/abc",
    });
    expect(resolveCheckoutTarget(null)).toBeNull();
    expect(resolveCheckoutTarget("not a url")).toBeNull();
  });

  it("parses PayOS order codes", () => {
    expect(parsePayosOrderCode("123456789")).toBe(123456789);
    expect(parsePayosOrderCode("abc")).toBeNull();
    expect(parsePayosOrderCode("-1")).toBeNull();
    expect(parsePayosOrderCode(null)).toBeNull();
  });
});

describe("sellerAvailableActions", () => {
  it("follows the seller state machine", () => {
    expect(sellerAvailableActions("PENDING")).toEqual(["confirm", "cancel"]);
    expect(sellerAvailableActions("CONFIRMED")).toEqual(["pack", "cancel"]);
    expect(sellerAvailableActions("PACKED")).toEqual(["ship", "cancel"]);
    expect(sellerAvailableActions("SHIPPING")).toEqual([]);
    expect(sellerAvailableActions("DELIVERED")).toEqual([]);
    expect(sellerAvailableActions(undefined)).toEqual([]);
  });
});

describe("date helpers", () => {
  it("parses ISO, zone-less, epoch and array timestamps", () => {
    expect(parseCommerceDate("2026-10-04T01:00:00Z")?.toISOString()).toBe("2026-10-04T01:00:00.000Z");
    expect(parseCommerceDate("2026-10-04T01:00:00")?.toISOString()).toBe("2026-10-04T01:00:00.000Z");
    expect(parseCommerceDate(1759539600)?.getUTCFullYear()).toBe(2025);
    expect(parseCommerceDate([2026, 10, 4, 1, 0, 0])?.toISOString()).toBe("2026-10-04T01:00:00.000Z");
    expect(parseCommerceDate(null)).toBeNull();
    expect(parseCommerceDate("nonsense")).toBeNull();
  });

  it("formats missing dates as a dash", () => {
    expect(formatCommerceDate(null)).toBe("—");
    expect(formatCommerceDate("2026-10-04T01:00:00Z", false)).toMatch(/2026/);
  });
});
