"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { LoginRequiredNotice } from "@/components/commerce/LoginRequiredNotice";
import { useRequireLogin } from "@/hooks/use-require-login";
import { parsePayosOrderCode } from "@/lib/commerce-utils";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import { consumerGuestPromptClass, consumerPageShellClass } from "@/lib/design-tokens";
import { CART_QUERY_KEY } from "@/services/cart-api";
import { orderApi, ORDERS_QUERY_KEY } from "@/services/order-api";

export default function OrderReturnPage() {
  return (
    <PageSuspense>
      <OrderReturnContent />
    </PageSuspense>
  );
}

function OrderReturnContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { ready, authed } = useRequireLogin();

  const status = searchParams.get("status");
  const cancelled = status === "cancel" || status === "CANCELLED" || searchParams.get("cancel") === "true";
  const orderCode = parsePayosOrderCode(searchParams.get("orderCode"));

  const confirm = useMutation({
    mutationFn: (code: number) => orderApi.payosReturn(code),
    onSuccess: (order) => {
      queryClient.setQueryData(["order", order.id], order);
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });

  // Fire once (guards against StrictMode double effects).
  const firedRef = useRef(false);
  const { mutate } = confirm;
  useEffect(() => {
    if (!ready || !authed || cancelled || orderCode == null || firedRef.current) return;
    firedRef.current = true;
    mutate(orderCode);
  }, [ready, authed, cancelled, orderCode, mutate]);

  if (ready && !authed) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoginRequiredNotice
          next={`/orders/return?${searchParams.toString()}`}
          message="Đăng nhập để xác nhận thanh toán"
        />
      </PageShell>
    );
  }

  const order = confirm.data;
  let body: React.ReactNode;

  if (cancelled) {
    body = (
      <>
        <XCircle className="mx-auto h-10 w-10 text-red-500" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">Bạn đã hủy thanh toán</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Đơn hàng vẫn được giữ trong thời gian chờ thanh toán. Bạn có thể thanh toán lại trong mục Đơn hàng.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/orders">Xem đơn hàng</Link>
          </Button>
        </div>
      </>
    );
  } else if (orderCode == null) {
    body = (
      <>
        <XCircle className="mx-auto h-10 w-10 text-red-500" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">Không tìm thấy mã thanh toán</h1>
        <p className="mt-1 text-sm text-muted-foreground">Liên kết trả về không hợp lệ.</p>
        <Button asChild size="sm" className="mt-5 rounded-full">
          <Link href="/orders">Về danh sách đơn hàng</Link>
        </Button>
      </>
    );
  } else if (!ready || confirm.isPending || confirm.isIdle) {
    body = (
      <>
        <h1 className="text-lg font-semibold">Đang xác nhận thanh toán…</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vui lòng không đóng trang.</p>
        <div className="mt-5">
          <LoadingSkeleton type="list" count={1} />
        </div>
      </>
    );
  } else if (confirm.isError) {
    body = (
      <>
        <XCircle className="mx-auto h-10 w-10 text-red-500" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">Không xác nhận được thanh toán</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {getCommerceErrorMessage(confirm.error, "Đã xảy ra lỗi. Vui lòng thử lại.")}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button size="sm" className="rounded-full" onClick={() => orderCode != null && confirm.mutate(orderCode)}>
            Thử lại
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href="/orders">Xem đơn hàng</Link>
          </Button>
        </div>
      </>
    );
  } else if (order && order.paymentStatus === "PAID") {
    body = (
      <>
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold" data-testid="payment-success">
          Thanh toán thành công
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cảm ơn bạn! Đơn <span className="font-mono">{order.orderCode}</span> đã được xác nhận.
        </p>
        <Button asChild size="sm" className="mt-5 rounded-full">
          <Link href={`/orders/${order.id}`}>Xem đơn hàng</Link>
        </Button>
      </>
    );
  } else {
    body = (
      <>
        <Clock className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">Đang chờ xác nhận thanh toán</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hệ thống chưa nhận được thanh toán. Nếu bạn đã chuyển tiền, vui lòng đợi ít phút rồi kiểm tra lại đơn hàng.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {order && (
            <Button asChild size="sm" className="rounded-full">
              <Link href={`/orders/${order.id}`}>Xem đơn hàng</Link>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => orderCode != null && confirm.mutate(orderCode)}
          >
            Kiểm tra lại
          </Button>
        </div>
      </>
    );
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className={consumerGuestPromptClass} aria-live="polite">
        {body}
      </div>
    </PageShell>
  );
}
