/** E-commerce (cart, checkout, orders, seller portal, settlements) — mirrors B2C_PIVOT_PLAN §3.5–3.6. */

export type OrderStatus = "PENDING_PAYMENT" | "CONFIRMED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export type PaymentMethod = "COD" | "PAYOS";
export type SellerOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";
export type ShipmentStatus =
  | "READY_TO_PICK"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED";
export type SettlementStatus = "PENDING" | "PAID";
export type Carrier = "GHN" | "GHTK" | "VIETTEL_POST" | "SELF";

/* ───────────── Cart ───────────── */

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  imageUrl: string;
  colorName?: string | null;
  sizeLabel?: string | null;
  unitPriceVnd: number;
  quantity: number;
  lineTotalVnd: number;
  stockQuantity: number;
  available: boolean;
}

export interface CartGroup {
  brandId: string;
  brandName: string;
  subtotalVnd: number;
  items: CartItem[];
}

export interface Cart {
  itemCount: number;
  subtotalVnd: number;
  groups: CartGroup[];
}

export interface AddCartItemRequest {
  productId: string;
  variantId: string;
  quantity: number;
}

/* ───────────── Address ───────────── */

export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "id">;

/** Address snapshot embedded in an order (no id / default flag). */
export type OrderAddress = Omit<Address, "id" | "isDefault">;

/* ───────────── Voucher ───────────── */

export interface UserVoucher {
  id: string;
  voucherType: string;
  status: string;
  maxDiscountVnd: number;
  sourceType?: string | null;
  orderId?: string | null;
  expiresAt?: string | null;
  usedAt?: string | null;
  createdAt?: string | null;
}

/* ───────────── Preview / place order ───────────── */

export interface OrderPreviewGroup {
  brandId: string;
  brandName: string;
  subtotalVnd: number;
  shippingFeeVnd: number;
  items: CartItem[];
}

export interface OrderPreview {
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  groups: OrderPreviewGroup[];
  voucher: { id: string; voucherType: string; maxDiscountVnd: number } | null;
}

export interface OrderPreviewRequest {
  addressId?: string | null;
  voucherId?: string | null;
  cartItemIds?: string[];
}

export interface PlaceOrderRequest {
  addressId: string;
  paymentMethod: PaymentMethod;
  voucherId?: string | null;
  cartItemIds?: string[];
  note?: string;
}

export interface PlaceOrderResult {
  order: OrderDetail;
  checkoutUrl?: string | null;
  mockPaid: boolean;
}

export interface PayOrderResult {
  checkoutUrl: string;
  mockPaid: boolean;
}

/* ───────────── Orders ───────────── */

export interface OrderSummary {
  id: string;
  orderCode: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalVnd: number;
  itemCount: number;
  firstItemImageUrl?: string | null;
  createdAt: string;
  /** Present in the admin order list only. */
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantLabel?: string | null;
  imageUrl?: string | null;
  unitPriceVnd: number;
  quantity: number;
  lineTotalVnd: number;
}

export interface ShipmentEvent {
  status: ShipmentStatus;
  description?: string | null;
  location?: string | null;
  occurredAt: string;
}

export interface Shipment {
  id: string;
  carrier: Carrier | string;
  trackingCode: string;
  status: ShipmentStatus;
  estimatedDeliveryAt?: string | null;
  events: ShipmentEvent[];
}

export interface SellerOrder {
  id: string;
  brandId: string;
  brandName: string;
  status: SellerOrderStatus;
  subtotalVnd: number;
  shippingFeeVnd: number;
  items: OrderItem[];
  shipment: Shipment | null;
}

export interface OrderDetail extends OrderSummary {
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  /** Part of a captured payment owed back to the customer for cancelled seller orders. */
  refundDueVnd?: number;
  note?: string | null;
  address: OrderAddress;
  sellerOrders: SellerOrder[];
}

export interface TrackingEntry {
  sellerOrderId: string;
  brandName: string;
  shipment: Shipment | null;
}

/* ───────────── Seller portal ───────────── */

export interface SellerOrderSummary {
  id: string;
  orderId: string;
  orderCode: string;
  status: SellerOrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalVnd: number;
  shippingFeeVnd: number;
  itemCount: number;
  firstItemImageUrl?: string | null;
  createdAt: string;
}

/** `GET /brand/orders/{id}` and seller transitions: only the brand's own slice of the order. */
export interface SellerOrderDetail {
  id: string;
  orderId: string;
  orderCode: string;
  brandId: string;
  brandName: string;
  status: SellerOrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalVnd: number;
  shippingFeeVnd: number;
  commissionVnd: number;
  payoutVnd: number;
  note?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  address: OrderAddress;
  items: OrderItem[];
  shipment: Shipment | null;
}

export interface ShipOrderRequest {
  carrier: Carrier;
  trackingCode?: string;
}

export interface ShipmentEventRequest {
  status: ShipmentStatus;
  description?: string;
  location?: string;
}

export interface SellerSettlementSummary {
  pendingVnd: number;
  eligibleVnd: number;
  paidVnd: number;
  nextEligibleAt?: string | null;
}

export interface SellerSettlement {
  id: string;
  brandId: string;
  brandName: string;
  status: SettlementStatus;
  subtotalVnd: number;
  commissionVnd: number;
  payoutVnd: number;
  /** Seller orders included in this settlement. */
  orderCount: number;
  payoutRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface PayoutAccount {
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
}

export interface SalesSummary {
  ordersLast30Days: number;
  revenueLast30DaysVnd: number;
  deliveredCount: number;
  cancelledCount: number;
}

/* ───────────── Admin ───────────── */

export interface CommerceSummary {
  gmvVnd: number;
  commissionVnd: number;
  ordersCount: number;
  pendingSettlementVnd: number;
}
