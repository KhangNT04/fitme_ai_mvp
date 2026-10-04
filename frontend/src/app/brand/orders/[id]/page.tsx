"use client";

import { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, MapPin, StickyNote, Wallet, XCircle } from "lucide-react";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { InfoCard } from "@/components/commerce/OrderOverview";
import { SellerOrderCard } from "@/components/commerce/SellerOrderCard";
import { SellerOrderActions } from "@/components/commerce/SellerOrderActions";
import { PaymentStatusBadge, SellerOrderStatusBadge } from "@/components/commerce/StatusBadge";
import { paymentMethodLabel } from "@/lib/commerce-labels";
import { formatAddressLine, formatCommerceDate } from "@/lib/commerce-utils";
import { sellerOrderApi } from "@/services/seller-order-api";
import { formatPrice } from "@/utils/format-price";

export default function BrandOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["seller-order", id],
    queryFn: () => sellerOrderApi.get(id),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["seller-order", id] });
    void queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
  };

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title={order ? `Đơn ${order.orderCode}` : "Chi tiết đơn hàng"}
        description="Xử lý đơn và theo dõi vận chuyển."
        backHref="/brand/orders"
        backLabel="Đơn hàng"
      />

      {isLoading && <LoadingSkeleton type="list" count={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {order && (
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
              <SellerOrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </section>

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
            <InfoCard icon={StickyNote} title="Ghi chú của khách">
              <p className="text-muted-foreground">{order.note}</p>
            </InfoCard>
          )}

          {order.cancelReason && (
            <InfoCard icon={XCircle} title="Lý do hủy">
              <p className="text-muted-foreground">{order.cancelReason}</p>
            </InfoCard>
          )}

          <SellerOrderCard
            sellerOrder={order}
            linkBrand={false}
            linkProducts={false}
            footer={<SellerOrderActions sellerOrder={order} onChanged={refresh} />}
          />

          <InfoCard icon={Wallet} title="Doanh thu của shop">
            <dl className="space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tạm tính</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotalVnd)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Phí nền tảng</dt>
                <dd className="tabular-nums">−{formatPrice(order.commissionVnd)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border/50 pt-1 font-semibold">
                <dt>Thực nhận</dt>
                <dd className="tabular-nums">{formatPrice(order.payoutVnd)}</dd>
              </div>
            </dl>
          </InfoCard>
        </div>
      )}
    </PortalLayout>
  );
}
