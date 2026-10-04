import type { ReactNode } from "react";
import { CreditCard, MapPin, StickyNote } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/commerce/StatusBadge";
import { PriceBreakdown } from "@/components/commerce/PriceBreakdown";
import { SellerOrderCard } from "@/components/commerce/SellerOrderCard";
import { paymentMethodLabel } from "@/lib/commerce-labels";
import { formatAddressLine, formatCommerceDate } from "@/lib/commerce-utils";
import { formatPrice } from "@/utils/format-price";
import type { OrderDetail, SellerOrder } from "@/types/commerce";

interface OrderOverviewProps {
  order: OrderDetail;
  /** Extra content rendered under each seller card (e.g. tracking link). */
  sellerFooter?: (sellerOrder: SellerOrder) => ReactNode;
  linkBrand?: boolean;
  linkProducts?: boolean;
  /** Rendered between the status header and the seller cards. */
  banner?: ReactNode;
}

export function InfoCard({ icon: Icon, title, children }: { icon: typeof MapPin; title: string; children: ReactNode }) {
  return (
    <section className="surface-card rounded-2xl p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        {title}
      </h2>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

/** Read-only order view shared by consumer, seller and admin screens. */
export function OrderOverview({
  order,
  sellerFooter,
  linkBrand = true,
  linkProducts = true,
  banner,
}: OrderOverviewProps) {
  return (
    <div className="space-y-4">
      <section className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 sm:p-5">
        <div>
          <p className="text-xs text-muted-foreground">Mã đơn hàng</p>
          <p className="font-mono text-base font-semibold" data-testid="order-code">
            {order.orderCode}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Đặt lúc {formatCommerceDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </section>

      {banner}

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard icon={MapPin} title="Địa chỉ nhận hàng">
          <p className="font-medium">
            {order.address.recipientName} · {order.address.phone}
          </p>
          <p className="mt-0.5 text-muted-foreground">{formatAddressLine(order.address)}</p>
        </InfoCard>
        <InfoCard icon={CreditCard} title="Thanh toán">
          <p>{paymentMethodLabel(order.paymentMethod)}</p>
        </InfoCard>
      </div>

      {order.note && (
        <InfoCard icon={StickyNote} title="Ghi chú">
          <p className="text-muted-foreground">{order.note}</p>
        </InfoCard>
      )}

      <div className="space-y-4">
        {order.sellerOrders.map((so) => (
          <SellerOrderCard
            key={so.id}
            sellerOrder={so}
            linkBrand={linkBrand}
            linkProducts={linkProducts}
            footer={sellerFooter?.(so)}
          />
        ))}
      </div>

      <section className="surface-card rounded-2xl p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">Chi tiết thanh toán</h2>
        <PriceBreakdown
          subtotalVnd={order.subtotalVnd}
          shippingFeeVnd={order.shippingFeeVnd}
          discountVnd={order.discountVnd}
          totalVnd={order.totalVnd}
        />
        {(order.refundDueVnd ?? 0) > 0 && (
          <div
            className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"
            data-testid="refund-due"
          >
            <span>Số tiền hoàn lại cho phần đơn đã huỷ</span>
            <span className="font-semibold tabular-nums">{formatPrice(order.refundDueVnd ?? 0)}</span>
          </div>
        )}
      </section>
    </div>
  );
}
