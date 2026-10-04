/** Vietnamese labels + badge colors for commerce statuses. */

export interface StatusStyle {
  label: string;
  /** Tailwind classes for a pill badge (border + bg + text). */
  className: string;
}

const NEUTRAL = "border-transparent bg-muted text-foreground";
const SUCCESS = "border-transparent bg-emerald-100 text-emerald-800";
const WARNING = "border-transparent bg-amber-100 text-amber-800";
const INFO = "border-transparent bg-sky-100 text-sky-800";
const PROGRESS = "border-transparent bg-violet-100 text-violet-800";
const DANGER = "border-transparent bg-red-100 text-red-700";

function fallback(status?: string | null): StatusStyle {
  return { label: status ? String(status) : "—", className: NEUTRAL };
}

const ORDER_STATUS: Record<string, StatusStyle> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", className: WARNING },
  CONFIRMED: { label: "Đã xác nhận", className: INFO },
  PROCESSING: { label: "Đang xử lý", className: PROGRESS },
  COMPLETED: { label: "Hoàn tất", className: SUCCESS },
  CANCELLED: { label: "Đã hủy", className: DANGER },
};

const PAYMENT_STATUS: Record<string, StatusStyle> = {
  UNPAID: { label: "Chưa thanh toán", className: WARNING },
  PAID: { label: "Đã thanh toán", className: SUCCESS },
  REFUNDED: { label: "Đã hoàn tiền", className: NEUTRAL },
};

const PAYMENT_METHOD: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  PAYOS: "Chuyển khoản / thẻ qua PayOS",
};

const SELLER_ORDER_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "Chờ xác nhận", className: WARNING },
  CONFIRMED: { label: "Đã xác nhận", className: INFO },
  PACKED: { label: "Đã đóng gói", className: INFO },
  SHIPPING: { label: "Đang giao", className: PROGRESS },
  DELIVERED: { label: "Đã giao", className: SUCCESS },
  CANCELLED: { label: "Đã hủy", className: DANGER },
  RETURNED: { label: "Hoàn trả", className: NEUTRAL },
};

const SHIPMENT_STATUS: Record<string, StatusStyle> = {
  READY_TO_PICK: { label: "Chờ lấy hàng", className: WARNING },
  PICKED_UP: { label: "Đã lấy hàng", className: INFO },
  IN_TRANSIT: { label: "Đang vận chuyển", className: PROGRESS },
  OUT_FOR_DELIVERY: { label: "Đang giao hàng", className: PROGRESS },
  DELIVERED: { label: "Giao thành công", className: SUCCESS },
  FAILED: { label: "Giao thất bại", className: DANGER },
  RETURNED: { label: "Đã hoàn hàng", className: NEUTRAL },
};

const SETTLEMENT_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: "Chờ chuyển khoản", className: WARNING },
  PAID: { label: "Đã thanh toán", className: SUCCESS },
};

const CARRIER: Record<string, string> = {
  GHN: "Giao Hàng Nhanh (GHN)",
  GHTK: "Giao Hàng Tiết Kiệm (GHTK)",
  VIETTEL_POST: "Viettel Post",
  SELF: "Shop tự giao",
};

export const CARRIER_OPTIONS: { value: "GHN" | "GHTK" | "VIETTEL_POST" | "SELF"; label: string }[] = [
  { value: "GHN", label: CARRIER.GHN },
  { value: "GHTK", label: CARRIER.GHTK },
  { value: "VIETTEL_POST", label: CARRIER.VIETTEL_POST },
  { value: "SELF", label: CARRIER.SELF },
];

export function orderStatusStyle(status?: string | null): StatusStyle {
  return (status && ORDER_STATUS[status]) || fallback(status);
}
export function orderStatusLabel(status?: string | null): string {
  return orderStatusStyle(status).label;
}

export function paymentStatusStyle(status?: string | null): StatusStyle {
  return (status && PAYMENT_STATUS[status]) || fallback(status);
}
export function paymentStatusLabel(status?: string | null): string {
  return paymentStatusStyle(status).label;
}

export function paymentMethodLabel(method?: string | null): string {
  return (method && PAYMENT_METHOD[method]) || (method ? String(method) : "—");
}

export function sellerOrderStatusStyle(status?: string | null): StatusStyle {
  return (status && SELLER_ORDER_STATUS[status]) || fallback(status);
}
export function sellerOrderStatusLabel(status?: string | null): string {
  return sellerOrderStatusStyle(status).label;
}

export function shipmentStatusStyle(status?: string | null): StatusStyle {
  return (status && SHIPMENT_STATUS[status]) || fallback(status);
}
export function shipmentStatusLabel(status?: string | null): string {
  return shipmentStatusStyle(status).label;
}

export function settlementStatusStyle(status?: string | null): StatusStyle {
  return (status && SETTLEMENT_STATUS[status]) || fallback(status);
}
export function settlementStatusLabel(status?: string | null): string {
  return settlementStatusStyle(status).label;
}

export function carrierLabel(carrier?: string | null): string {
  return (carrier && CARRIER[carrier]) || (carrier ? String(carrier) : "—");
}

/** Map backend `errorCode` of commerce endpoints to friendly Vietnamese copy (undefined → use server message). */
export function commerceErrorMessage(code?: string): string | undefined {
  switch (code) {
    case "OUT_OF_STOCK":
      return "Sản phẩm không đủ hàng. Vui lòng giảm số lượng hoặc chọn phân loại khác.";
    case "CART_EMPTY":
      return "Giỏ hàng của bạn đang trống.";
    case "ORDER_NOT_CANCELLABLE":
      return "Đơn hàng đã được giao đi nên không thể hủy.";
    case "INVALID_STATUS_TRANSITION":
      return "Không thể chuyển sang trạng thái này. Vui lòng tải lại trang.";
    default:
      return undefined;
  }
}
