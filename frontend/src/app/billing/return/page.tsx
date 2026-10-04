"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { subscriptionApi } from "@/services/subscription-api";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import Link from "next/link";

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

  const returnMutation = useMutation({
    mutationFn: (code: number) => subscriptionApi.return(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fitken-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["consumer-entitlement"] });
    },
  });
  const { mutate } = returnMutation;

  useEffect(() => {
    if (cancelled || !orderCode) return;
    mutate(Number(orderCode));
  }, [orderCode, cancelled, mutate]);

  const errorMessage = cancelled
    ? "Thanh toán đã bị hủy."
    : !orderCode
      ? "Không tìm thấy mã đơn hàng."
      : returnMutation.isError
        ? getUserErrorMessage(returnMutation.error, "Có lỗi xảy ra khi xác nhận thanh toán.")
        : null;
  const status = errorMessage ? "error" : returnMutation.isSuccess ? "success" : "loading";

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
              Cảm ơn bạn đã nâng cấp FitMe Pro. Fitken và Voucher đã được cộng vào tài khoản.
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
