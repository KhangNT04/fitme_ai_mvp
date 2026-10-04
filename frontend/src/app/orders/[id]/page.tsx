"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CreditCard, XCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { LoginRequiredNotice } from "@/components/commerce/LoginRequiredNotice";
import { OrderOverview } from "@/components/commerce/OrderOverview";
import { ReasonDialog } from "@/components/commerce/ReasonDialog";
import { ShipmentTimeline } from "@/components/commerce/ShipmentTimeline";
import { useRequireLogin } from "@/hooks/use-require-login";
import { canCancelOrder, canPayOrder, resolveCheckoutTarget } from "@/lib/commerce-utils";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import { getApiErrorCode } from "@/services/api-client";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { orderApi, ORDERS_QUERY_KEY } from "@/services/order-api";
import { toast } from "@/stores/toast-store";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <OrderDetailContent params={params} />
    </PageSuspense>
  );
}

function OrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ready, authed } = useRequireLogin();
  const enabled = ready && authed;
  const [cancelOpen, setCancelOpen] = useState(false);

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => orderApi.get(id),
    enabled,
  });
  const order = orderQuery.data;
  const hasShipment = !!order?.sellerOrders.some((s) => s.shipment);

  const trackingQuery = useQuery({
    queryKey: ["order-tracking", id],
    queryFn: () => orderApi.tracking(id),
    enabled: enabled && hasShipment,
  });

  const refreshOrder = () => {
    void queryClient.invalidateQueries({ queryKey: ["order", id] });
    void queryClient.invalidateQueries({ queryKey: ["order-tracking", id] });
    void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
  };

  const cancel = useMutation({
    mutationFn: (reason: string) => orderApi.cancel(id, reason),
    onSuccess: (next) => {
      queryClient.setQueryData(["order", id], next);
      refreshOrder();
      setCancelOpen(false);
      toast.success("Đã hủy đơn hàng");
    },
    onError: (e) => {
      toast.error(getCommerceErrorMessage(e, "Không hủy được đơn hàng"));
      if (getApiErrorCode(e) === "ORDER_NOT_CANCELLABLE") {
        setCancelOpen(false);
        refreshOrder();
      }
    },
  });

  const pay = useMutation({
    mutationFn: () => orderApi.pay(id),
    onSuccess: (result) => {
      const target = resolveCheckoutTarget(result.checkoutUrl);
      if (target?.kind === "internal") router.push(target.url);
      else if (target?.kind === "external") window.location.assign(target.url);
      else toast.error("Không mở được trang thanh toán. Vui lòng thử lại.");
    },
    onError: (e) => {
      toast.error(getCommerceErrorMessage(e, "Không tạo được liên kết thanh toán"));
      refreshOrder();
    },
  });

  const header = (
    <CollapsingPageHeader
      title="Chi tiết đơn hàng"
      backHref="/orders"
      backLabel="Đơn hàng"
      showMobileBack
    />
  );

  if (ready && !authed) {
    return (
      <PageShell width="wide" className={consumerPageShellClass}>
        {header}
        <LoginRequiredNotice next={`/orders/${id}`} />
      </PageShell>
    );
  }

  if (!ready || orderQuery.isLoading) {
    return (
      <PageShell width="wide" className={consumerPageShellClass}>
        {header}
        <LoadingSkeleton type="list" count={4} />
      </PageShell>
    );
  }

  if (orderQuery.error || !order) {
    return (
      <PageShell width="wide" className={consumerPageShellClass}>
        {header}
        <ErrorState
          title="Không tìm thấy đơn hàng"
          message="Đơn hàng không tồn tại hoặc bạn không có quyền xem."
          onRetry={() => orderQuery.refetch()}
        />
      </PageShell>
    );
  }

  const showPay = canPayOrder(order);
  const showCancel = canCancelOrder(order, order.sellerOrders);
  const tracking = trackingQuery.data ?? [];

  const banner = (
    <>
      {showPay && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          data-testid="pay-banner"
        >
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            Đơn hàng đang chờ thanh toán. Đơn quá hạn sẽ tự động hủy.
          </p>
          <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate()}>
            <CreditCard className="mr-1.5 h-4 w-4" />
            {pay.isPending ? "Đang tạo liên kết..." : "Thanh toán lại"}
          </Button>
        </div>
      )}
      {order.status === "CANCELLED" && (
        <p className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden />
          Đơn hàng đã bị hủy.
          {order.paymentStatus === "REFUNDED" ? " Tiền sẽ được hoàn lại theo phương thức thanh toán." : ""}
        </p>
      )}
    </>
  );

  return (
    <PageShell width="wide" className={cn(consumerPageShellClass, "space-y-4")}>
      {header}
      <OrderOverview
        order={order}
        banner={showPay || order.status === "CANCELLED" ? <div className="space-y-4">{banner}</div> : undefined}
      />

      {hasShipment && (
        <section className="space-y-3" aria-labelledby="tracking-heading">
          <h2 id="tracking-heading" className="text-base font-semibold">
            Theo dõi vận chuyển
          </h2>
          {trackingQuery.isLoading && <LoadingSkeleton type="list" count={1} />}
          {trackingQuery.error && <ErrorState onRetry={() => trackingQuery.refetch()} />}
          {tracking.map((entry) => (
            <ShipmentTimeline key={entry.sellerOrderId} shipment={entry.shipment} brandName={entry.brandName} />
          ))}
        </section>
      )}

      {showCancel && (
        <div className="flex justify-end">
          <Button variant="outline" className="text-red-600" onClick={() => setCancelOpen(true)} data-testid="cancel-order">
            Hủy đơn hàng
          </Button>
        </div>
      )}

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy đơn hàng?"
        description="Sản phẩm sẽ được hoàn lại kho và voucher (nếu có) sẽ được trả lại. Thao tác không thể hoàn tác."
        label="Lý do hủy (không bắt buộc)"
        placeholder="Ví dụ: đặt nhầm sản phẩm"
        defaultReason="Khách hàng hủy đơn"
        confirmLabel="Hủy đơn"
        destructive
        loading={cancel.isPending}
        onConfirm={(reason) => cancel.mutate(reason)}
      />
    </PageShell>
  );
}
