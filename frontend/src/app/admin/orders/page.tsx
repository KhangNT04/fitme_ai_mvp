"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
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
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/commerce/StatusBadge";
import { StatusTabs } from "@/components/commerce/StatusTabs";
import { paymentMethodLabel } from "@/lib/commerce-labels";
import { ORDER_TABS, formatCommerceDate, orderTabToStatusParam } from "@/lib/commerce-utils";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
} from "@/lib/design-tokens";
import { adminCommerceApi } from "@/services/admin-commerce-api";
import { formatPrice } from "@/utils/format-price";

export default function AdminOrdersPage() {
  const [tab, setTab] = useState("ALL");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders", tab],
    queryFn: () => adminCommerceApi.listOrders(orderTabToStatusParam(tab)),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Đơn hàng" description="Giám sát toàn bộ đơn hàng trên sàn." />

      <StatusTabs tabs={ORDER_TABS} value={tab} onChange={setTab} ariaLabel="Lọc đơn theo trạng thái" />

      {isLoading && <LoadingSkeleton type="list" />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="Chưa có đơn hàng" />}

      {data && data.length > 0 && (
        <>
          <div className={portalCardListClass}>
            {data.map((o) => (
              <article key={o.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-sm font-semibold hover:underline">
                      {o.orderCode}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.itemCount} sản phẩm · {formatCommerceDate(o.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-medium">{formatPrice(o.totalVnd)}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className={portalCardActionsClass}>
                  <PortalActionLink variant="view" href={`/admin/orders/${o.id}`}>
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
                <th className={portalTableThClass}>Tổng tiền</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((o) => (
                <tr key={o.id}>
                  <td className={portalTableTdClass}>
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium hover:underline">
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
                  <td className={portalTableTdClass}>{formatPrice(o.totalVnd)}</td>
                  <td className={portalTableTdClass}>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className={portalTableTdClass}>
                    <PortalActionLink variant="view" href={`/admin/orders/${o.id}`}>
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
