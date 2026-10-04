import Link from "next/link";
import type { ReactNode } from "react";
import { SellerOrderStatusBadge } from "@/components/commerce/StatusBadge";
import { ProductThumb } from "@/components/commerce/ProductThumb";
import { carrierLabel } from "@/lib/commerce-labels";
import { formatPrice } from "@/utils/format-price";
import { cn } from "@/lib/utils";
import type { OrderItem, SellerOrder } from "@/types/commerce";

export function OrderItemRow({ item, linkProduct = true }: { item: OrderItem; linkProduct?: boolean }) {
  return (
    <li className="flex gap-3 py-3">
      <ProductThumb
        src={item.imageUrl}
        alt={item.name}
        href={linkProduct ? `/products/${item.productId}` : undefined}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
        {item.variantLabel && <p className="mt-0.5 text-xs text-muted-foreground">{item.variantLabel}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatPrice(item.unitPriceVnd)} × {item.quantity}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(item.lineTotalVnd)}</p>
    </li>
  );
}

interface SellerOrderCardProps {
  sellerOrder: SellerOrder;
  /** Link to the brand storefront page (consumer view). */
  linkBrand?: boolean;
  linkProducts?: boolean;
  footer?: ReactNode;
  className?: string;
}

/** One seller's slice of an order: items, subtotal + shipping, and a compact shipment line. */
export function SellerOrderCard({
  sellerOrder,
  linkBrand = true,
  linkProducts = true,
  footer,
  className,
}: SellerOrderCardProps) {
  const { shipment } = sellerOrder;
  return (
    <section className={cn("surface-card rounded-2xl p-4 sm:p-5", className)} data-testid="seller-order-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        {linkBrand ? (
          <Link href={`/discover/brand/${sellerOrder.brandId}`} className="text-sm font-semibold hover:underline">
            {sellerOrder.brandName}
          </Link>
        ) : (
          <p className="text-sm font-semibold">{sellerOrder.brandName}</p>
        )}
        <SellerOrderStatusBadge status={sellerOrder.status} />
      </header>

      <ul className="divide-y divide-border/40">
        {sellerOrder.items.map((item) => (
          <OrderItemRow key={item.id} item={item} linkProduct={linkProducts} />
        ))}
      </ul>

      <dl className="space-y-1 border-t border-border/50 pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tạm tính</dt>
          <dd className="tabular-nums">{formatPrice(sellerOrder.subtotalVnd)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Phí vận chuyển</dt>
          <dd className="tabular-nums">{formatPrice(sellerOrder.shippingFeeVnd)}</dd>
        </div>
        {shipment && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Vận đơn</dt>
            <dd className="text-right">
              {carrierLabel(shipment.carrier)} ·{" "}
              <span className="font-mono">{shipment.trackingCode}</span>
            </dd>
          </div>
        )}
      </dl>

      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}
