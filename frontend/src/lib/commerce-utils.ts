import type { Address, AddressInput, Cart, CartItem, OrderAddress, OrderSummary, SellerOrder } from "@/types/commerce";

/* ───────────── Quantity helpers ───────────── */

export const MAX_CART_QUANTITY = 99;

/** Clamp a desired quantity to [min, min(stock, MAX_CART_QUANTITY)]. */
export function clampQuantity(quantity: number, stock: number | undefined | null, min = 1): number {
  const cap = Math.min(
    MAX_CART_QUANTITY,
    stock == null || !Number.isFinite(stock) ? MAX_CART_QUANTITY : Math.max(0, Math.floor(stock)),
  );
  if (cap < min) return Math.max(0, cap);
  const q = Number.isFinite(quantity) ? Math.floor(quantity) : min;
  return Math.min(cap, Math.max(min, q));
}

/* ───────────── Cart ───────────── */

export function cartItemVariantLabel(item: {
  colorName?: string | null;
  sizeLabel?: string | null;
}): string {
  return [item.colorName, item.sizeLabel].filter(Boolean).join(" / ");
}

/** Cart lines that can be checked out right now. */
export function availableCartItems(cart: Cart | undefined | null): CartItem[] {
  if (!cart) return [];
  return cart.groups.flatMap((g) => g.items).filter((i) => i.available && i.quantity > 0);
}

export function unavailableCartItems(cart: Cart | undefined | null): CartItem[] {
  if (!cart) return [];
  return cart.groups.flatMap((g) => g.items).filter((i) => !i.available);
}

export function sumCartSubtotal(items: Pick<CartItem, "lineTotalVnd">[]): number {
  return items.reduce((sum, i) => sum + i.lineTotalVnd, 0);
}

/* ───────────── Pricing ───────────── */

/** Client-side estimate when preview is not available (e.g. before choosing a voucher). */
export function computeFreeshipDiscount(shippingFeeVnd: number, maxDiscountVnd: number): number {
  return Math.max(0, Math.min(shippingFeeVnd, maxDiscountVnd));
}

export function computeOrderTotal(subtotalVnd: number, shippingFeeVnd: number, discountVnd: number): number {
  return Math.max(0, subtotalVnd + shippingFeeVnd - discountVnd);
}

/* ───────────── Order helpers ───────────── */

/** Status filter tabs on /orders. `value` is the backend `status` query param (undefined = all). */
export const ORDER_TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export function orderTabToStatusParam(tab: string): string | undefined {
  return tab === "ALL" ? undefined : tab;
}

type OrderLike = Pick<OrderSummary, "status" | "paymentMethod">;

/** Customer can cancel until a seller order is shipping / delivered (backend enforces). */
export function canCancelOrder(
  order: OrderLike,
  sellerOrders?: Pick<SellerOrder, "status">[],
): boolean {
  if (order.status === "CANCELLED" || order.status === "COMPLETED") return false;
  if (sellerOrders?.some((s) => s.status === "SHIPPING" || s.status === "DELIVERED")) return false;
  return true;
}

export function canPayOrder(order: OrderLike): boolean {
  return order.status === "PENDING_PAYMENT" && order.paymentMethod === "PAYOS";
}

export function formatAddressLine(address: Partial<OrderAddress> | null | undefined): string {
  if (!address) return "";
  return [address.street, address.ward, address.district, address.province].filter(Boolean).join(", ");
}

export function emptyAddressInput(): AddressInput {
  return {
    recipientName: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    street: "",
    isDefault: false,
  };
}

const VN_PHONE_RE = /^(0|\+?84)\d{9,10}$/;

export function isValidVnPhone(phone: string): boolean {
  return VN_PHONE_RE.test(phone.replace(/[\s.-]/g, ""));
}

/** Returns first Vietnamese validation message, or null when valid. */
export function validateAddressInput(input: AddressInput): string | null {
  if (!input.recipientName.trim()) return "Vui lòng nhập tên người nhận";
  if (!input.phone.trim()) return "Vui lòng nhập số điện thoại";
  if (!isValidVnPhone(input.phone)) return "Số điện thoại không hợp lệ";
  if (!input.province.trim()) return "Vui lòng nhập tỉnh / thành phố";
  if (!input.district.trim()) return "Vui lòng nhập quận / huyện";
  if (!input.ward.trim()) return "Vui lòng nhập phường / xã";
  if (!input.street.trim()) return "Vui lòng nhập số nhà, tên đường";
  return null;
}

export function pickDefaultAddress(addresses: Address[] | undefined | null): Address | undefined {
  if (!addresses?.length) return undefined;
  return addresses.find((a) => a.isDefault) ?? addresses[0];
}

/**
 * Where to send the browser after a place-order / pay call.
 * Mock PayOS returns an in-app path (`/orders/return?...`), live PayOS an absolute URL.
 */
export function resolveCheckoutTarget(
  checkoutUrl: string | null | undefined,
): { kind: "internal" | "external"; url: string } | null {
  if (!checkoutUrl) return null;
  if (checkoutUrl.startsWith("/")) return { kind: "internal", url: checkoutUrl };
  try {
    const parsed = new URL(checkoutUrl);
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return { kind: "internal", url: `${parsed.pathname}${parsed.search}` };
    }
    return { kind: "external", url: checkoutUrl };
  } catch {
    return null;
  }
}

/** Parse `orderCode` (numeric PayOS code) from the return-page query string. */
export function parsePayosOrderCode(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && Number.isInteger(n) ? n : null;
}

/* ───────────── Seller helpers ───────────── */

export type SellerAction = "confirm" | "pack" | "ship" | "cancel";

/** Which transitions the seller can trigger from a seller order status. */
export function sellerAvailableActions(status: string | undefined | null): SellerAction[] {
  switch (status) {
    case "PENDING":
      return ["confirm", "cancel"];
    case "CONFIRMED":
      return ["pack", "cancel"];
    case "PACKED":
      return ["ship", "cancel"];
    default:
      return [];
  }
}

export const SELLER_ORDER_TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "PACKED", label: "Đã đóng gói" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "DELIVERED", label: "Đã giao" },
  { value: "CANCELLED", label: "Đã hủy" },
];

/** Shipment statuses a seller may report manually (in progress order). */
export const SHIPMENT_EVENT_OPTIONS = [
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
] as const;

/* ───────────── Date ───────────── */

/** Accepts ISO strings, epoch millis/seconds or Jackson array timestamps. */
export function parseCommerceDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const ms = value < 1e11 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    // Backend may emit zone-less LocalDateTime strings (assume UTC like Instant).
    const iso = /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(value) ? `${value}Z` : value;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, mo, da, h = 0, mi = 0, s = 0] = value as number[];
    const d = new Date(Date.UTC(y, mo - 1, da, h, mi, s));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatCommerceDate(value: unknown, withTime = true): string {
  const d = parseCommerceDate(value);
  if (!d) return "—";
  return withTime
    ? d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
    : d.toLocaleDateString("vi-VN");
}
