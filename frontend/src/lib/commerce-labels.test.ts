import { describe, expect, it } from "vitest";
import {
  CARRIER_OPTIONS,
  carrierLabel,
  commerceErrorMessage,
  orderStatusLabel,
  orderStatusStyle,
  paymentMethodLabel,
  paymentStatusLabel,
  sellerOrderStatusLabel,
  settlementStatusLabel,
  shipmentStatusLabel,
} from "./commerce-labels";

describe("order status labels", () => {
  it("maps every OrderStatus to Vietnamese", () => {
    expect(orderStatusLabel("PENDING_PAYMENT")).toBe("Chờ thanh toán");
    expect(orderStatusLabel("CONFIRMED")).toBe("Đã xác nhận");
    expect(orderStatusLabel("PROCESSING")).toBe("Đang xử lý");
    expect(orderStatusLabel("COMPLETED")).toBe("Hoàn tất");
    expect(orderStatusLabel("CANCELLED")).toBe("Đã hủy");
  });

  it("falls back to raw value / dash for unknown statuses", () => {
    expect(orderStatusLabel("WEIRD")).toBe("WEIRD");
    expect(orderStatusLabel(undefined)).toBe("—");
    expect(orderStatusStyle(null).className).toContain("bg-muted");
  });

  it("uses distinct colors for success and danger", () => {
    expect(orderStatusStyle("COMPLETED").className).toContain("emerald");
    expect(orderStatusStyle("CANCELLED").className).toContain("red");
    expect(orderStatusStyle("PENDING_PAYMENT").className).toContain("amber");
  });
});

describe("payment labels", () => {
  it("maps payment status", () => {
    expect(paymentStatusLabel("UNPAID")).toBe("Chưa thanh toán");
    expect(paymentStatusLabel("PAID")).toBe("Đã thanh toán");
    expect(paymentStatusLabel("REFUNDED")).toBe("Đã hoàn tiền");
  });

  it("maps payment method", () => {
    expect(paymentMethodLabel("COD")).toContain("COD");
    expect(paymentMethodLabel("PAYOS")).toContain("PayOS");
    expect(paymentMethodLabel(null)).toBe("—");
  });
});

describe("seller order / shipment / settlement labels", () => {
  it("maps seller order statuses", () => {
    expect(sellerOrderStatusLabel("PENDING")).toBe("Chờ xác nhận");
    expect(sellerOrderStatusLabel("PACKED")).toBe("Đã đóng gói");
    expect(sellerOrderStatusLabel("SHIPPING")).toBe("Đang giao");
    expect(sellerOrderStatusLabel("DELIVERED")).toBe("Đã giao");
    expect(sellerOrderStatusLabel("RETURNED")).toBe("Hoàn trả");
  });

  it("maps shipment statuses", () => {
    expect(shipmentStatusLabel("READY_TO_PICK")).toBe("Chờ lấy hàng");
    expect(shipmentStatusLabel("OUT_FOR_DELIVERY")).toBe("Đang giao hàng");
    expect(shipmentStatusLabel("DELIVERED")).toBe("Giao thành công");
    expect(shipmentStatusLabel("FAILED")).toBe("Giao thất bại");
  });

  it("maps settlement statuses", () => {
    expect(settlementStatusLabel("PENDING")).toBe("Chờ chuyển khoản");
    expect(settlementStatusLabel("PAID")).toBe("Đã thanh toán");
  });

  it("labels carriers and exposes all four options", () => {
    expect(carrierLabel("GHN")).toContain("GHN");
    expect(carrierLabel("SELF")).toBe("Shop tự giao");
    expect(CARRIER_OPTIONS.map((c) => c.value)).toEqual(["GHN", "GHTK", "VIETTEL_POST", "SELF"]);
  });
});

describe("commerceErrorMessage", () => {
  it("maps known backend error codes", () => {
    expect(commerceErrorMessage("OUT_OF_STOCK")).toMatch(/không đủ hàng/i);
    expect(commerceErrorMessage("CART_EMPTY")).toMatch(/trống/);
    expect(commerceErrorMessage("ORDER_NOT_CANCELLABLE")).toMatch(/không thể hủy/);
    expect(commerceErrorMessage("INVALID_STATUS_TRANSITION")).toMatch(/trạng thái/);
  });

  it("returns undefined for unknown codes", () => {
    expect(commerceErrorMessage("SOMETHING_ELSE")).toBeUndefined();
    expect(commerceErrorMessage(undefined)).toBeUndefined();
  });
});
