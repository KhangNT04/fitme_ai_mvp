"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalActionLink } from "@/components/portal/PortalActionButton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { PaymentStatusBadge, SellerOrderStatusBadge } from "@/components/commerce/StatusBadge";
import { StatusTabs } from "@/components/commerce/StatusTabs";
import { paymentMethodLabel } from "@/lib/commerce-labels";
import { SELLER_ORDER_TABS, formatCommerceDate, orderTabToStatusParam } from "@/lib/commerce-utils";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
} from "@/lib/design-tokens";
import { sellerOrderApi } from "@/services/seller-order-api";
import { formatPrice } from "@/utils/format-price";

export default function BrandOrdersPage() {
  const [tab, setTab] = useState("ALL");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["seller-orders", tab],
    queryFn: () => sellerOrderApi.list(orderTabToStatusParam(tab)),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader title="Đơn hàng" description="Xác nhận, đóng gói và giao đơn hàng của khách." />

      <StatusTabs tabs={SELLER_ORDER_TABS} value={tab} onChange={setTab} ariaLabel="Lọc đơn theo trạng thái" />

      {isLoading && <LoadingSkeleton type="list" />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          title="Chưa có đơn hàng"
          description={tab === "ALL" ? "Đơn hàng của khách sẽ xuất hiện ở đây." : "Không có đơn ở trạng thái này."}
        />
      )}

      {data && data.length > 0 && (
        <>
          <div className={portalCardListClass}>
            {data.map((o) => (
              <article key={o.id} className={portalCardClass} data-testid="seller-order-row">
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <Link href={`/brand/orders/${o.id}`} className="font-mono text-sm font-semibold hover:underline">
                      {o.orderCode}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.itemCount} sản phẩm · {formatCommerceDate(o.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-medium">{formatPrice(o.subtotalVnd)}</p>
                  </div>
                  <SellerOrderStatusBadge status={o.status} />
                </div>
                <div className={portalCardActionsClass}>
                  <PortalActionLink variant="view" href={`/brand/orders/${o.id}`}>
                    Chi tiết
                  </PortalActionLink>
                </div>
              </article>
            ))}
          </div>

          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Mã đơn</th>
                <th className={portalTableThClass}>Ngày đặt</th>
                <th className={portalTableThClass}>SL</th>
                <th className={portalTableThClass}>Thanh toán</th>
                <th className={portalTableThClass}>Giá trị hàng</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((o) => (
                <tr key={o.id} data-testid="seller-order-row">
                  <td className={portalTableTdClass}>
                    <Link href={`/brand/orders/${o.id}`} className="font-mono font-medium hover:underline">
                      {o.orderCode}
                    </Link>
                  </td>
                  <td className={portalTableTdClass}>{formatCommerceDate(o.createdAt)}</td>
                  <td className={portalTableTdClass}>{o.itemCount}</td>
                  <td className={portalTableTdClass}>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs text-muted-foreground">
                        {paymentMethodLabel(o.paymentMethod).split(" (")[0]}
                      </span>
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </div>
                  </td>
                  <td className={portalTableTdClass}>{formatPrice(o.subtotalVnd)}</td>
                  <td className={portalTableTdClass}>
                    <SellerOrderStatusBadge status={o.status} />
                  </td>
                  <td className={portalTableTdClass}>
                    <PortalActionLink variant="view" href={`/brand/orders/${o.id}`}>
                      Chi tiết
                    </PortalActionLink>
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}
    </PortalLayout>
  );
}
