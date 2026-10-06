"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { subscriptionApi } from "@/services/subscription-api";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import Link from "next/link";

const PENDING_POLL_MS = 3000;
const PENDING_MAX_POLLS = 20;

function isCancelledReturn(params: URLSearchParams): boolean {
  const status = params.get("status")?.toLowerCase();
  return params.get("cancel") === "true" || status === "cancel" || status === "cancelled";
}

export default function BillingReturnPage() {
  return (
    <PageSuspense>
      <BillingReturnContent />
    </PageSuspense>
  );
}

function BillingReturnContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const orderCode = searchParams.get("orderCode");
  const cancelled = isCancelledReturn(searchParams);

  const orderQuery = useQuery({
    queryKey: ["billing-return", orderCode],
    queryFn: () => subscriptionApi.return(Number(orderCode)),
    enabled: !cancelled && !!orderCode,
    retry: 1,
    // The PayOS webhook can land after the redirect, so keep asking while the order is PENDING.
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING" && query.state.dataUpdateCount < PENDING_MAX_POLLS
        ? PENDING_POLL_MS
        : false,
  });
  const orderStatus = orderQuery.data?.status;
  const pollsExhausted =
    orderStatus === "PENDING" &&
    (queryClient.getQueryState(["billing-return", orderCode])?.dataUpdateCount ?? 0) >= PENDING_MAX_POLLS;

  useEffect(() => {
    if (orderStatus !== "PAID") return;
    void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
    void queryClient.invalidateQueries({ queryKey: ["consumer-entitlement"] });
  }, [orderStatus, queryClient]);

  const errorMessage = cancelled
    ? "Thanh toán đã bị hủy."
    : !orderCode
      ? "Không tìm thấy mã đơn hàng."
      : orderQuery.isError
        ? getUserErrorMessage(orderQuery.error, "Có lỗi xảy ra khi xác nhận thanh toán.")
        : orderStatus === "CANCELLED" || orderStatus === "EXPIRED"
          ? "Đơn thanh toán đã bị hủy hoặc hết hạn. Bạn chưa bị trừ tiền cho đơn này."
          : null;
  const status = errorMessage
    ? "error"
    : orderStatus === "PAID"
      ? "success"
      : pollsExhausted
        ? "pending"
        : "loading";

  return (
    <PageShell width="narrow" className={consumerPageShellClass}>
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Đang xác nhận thanh toán...</h1>
            <p className="text-muted-foreground">Vui lòng không đóng trang này.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Thanh toán thành công!</h1>
            <p className="text-muted-foreground">
              Cảm ơn bạn đã mua {orderQuery.data?.planName ?? "gói FitMe"}. Quyền lợi của gói đã được cộng
              vào tài khoản.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-4">
              <Button asChild className="w-full rounded-full">
                <Link href="/try-on">Thử đồ AI ngay</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link href="/rewards">Xem ví Fitken</Link>
              </Button>
            </div>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="rounded-full bg-amber-100 p-3">
              <Clock className="h-12 w-12 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">Đang chờ xác nhận thanh toán</h1>
            <p className="text-muted-foreground">
              Cổng thanh toán chưa gửi xác nhận cho đơn này. Nếu bạn đã chuyển khoản, quyền lợi sẽ được cộng tự
              động khi FitMe nhận được xác nhận.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-4">
              <Button className="w-full rounded-full" onClick={() => void orderQuery.refetch()}>
                Kiểm tra lại
              </Button>
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link href="/rewards">Xem ví Fitken</Link>
              </Button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="rounded-full bg-red-100 p-3">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold">Thanh toán không thành công</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-4">
              <Button asChild className="w-full rounded-full">
                <Link href="/pricing">Thử lại</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link href="/">Về trang chủ</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
