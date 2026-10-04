import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/commerce/StatusBadge";
import { ProductThumb } from "@/components/commerce/ProductThumb";
import { paymentMethodLabel } from "@/lib/commerce-labels";
import { formatCommerceDate } from "@/lib/commerce-utils";
import { formatPrice } from "@/utils/format-price";
import type { OrderSummary } from "@/types/commerce";

interface OrderSummaryCardProps {
  order: OrderSummary;
  href: string;
}

export function OrderSummaryCard({ order, href }: OrderSummaryCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="surface-card flex items-center gap-3 rounded-2xl p-3 transition-shadow hover:shadow-md sm:p-4"
        data-testid="order-card"
      >
        <ProductThumb src={order.firstItemImageUrl} alt={`Đơn ${order.orderCode}`} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="truncate font-mono text-sm font-semibold">{order.orderCode}</p>
          <p className="text-xs text-muted-foreground">
            {order.itemCount} sản phẩm · {paymentMethodLabel(order.paymentMethod).split(" (")[0]}
          </p>
          <p className="text-xs text-muted-foreground">{formatCommerceDate(order.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-sm font-bold tabular-nums">{formatPrice(order.totalVnd)}</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </Link>
    </li>
  );
}
