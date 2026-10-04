"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { LoginRequiredNotice } from "@/components/commerce/LoginRequiredNotice";
import { OrderSummaryCard } from "@/components/commerce/OrderSummaryCard";
import { StatusTabs } from "@/components/commerce/StatusTabs";
import { useRequireLogin } from "@/hooks/use-require-login";
import { ORDER_TABS, orderTabToStatusParam } from "@/lib/commerce-utils";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { orderApi, ORDERS_QUERY_KEY } from "@/services/order-api";

export default function OrdersPage() {
  return (
    <PageSuspense>
      <OrdersContent />
    </PageSuspense>
  );
}

function OrdersContent() {
  const { ready, authed } = useRequireLogin();
  const [tab, setTab] = useState("ALL");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, tab],
    queryFn: () => orderApi.list(orderTabToStatusParam(tab)),
    enabled: ready && authed,
  });

  const header = (
    <CollapsingPageHeader
      title="Đơn hàng của tôi"
      subtitle="Theo dõi trạng thái thanh toán và vận chuyển"
      backHref="/profile"
      backLabel="Hồ sơ"
      showMobileBack
    />
  );

  if (ready && !authed) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        {header}
        <LoginRequiredNotice next="/orders" message="Đăng nhập để xem đơn hàng của bạn" />
      </PageShell>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      {header}
      <div className="space-y-4">
        <StatusTabs tabs={ORDER_TABS} value={tab} onChange={setTab} ariaLabel="Lọc đơn hàng theo trạng thái" />

        {(!ready || isLoading) && <LoadingSkeleton type="list" count={3} />}
        {error && <ErrorState onRetry={() => refetch()} />}

        {data && data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center" data-testid="orders-empty">
            <Receipt className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
            <p className="mt-3 text-sm font-medium">
              {tab === "ALL" ? "Bạn chưa có đơn hàng nào" : "Không có đơn hàng ở trạng thái này"}
            </p>
            <Button asChild className="mt-4 rounded-full" size="sm">
              <Link href="/discover">Khám phá sản phẩm</Link>
            </Button>
          </div>
        )}

        {data && data.length > 0 && (
          <ul className="space-y-3">
            {data.map((order) => (
              <OrderSummaryCard key={order.id} order={order} href={`/orders/${order.id}`} />
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
