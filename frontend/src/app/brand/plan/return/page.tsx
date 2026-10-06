"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PageSuspense } from "@/components/common/PageSuspense";
import { Button } from "@/components/ui/button";
import { BRAND_PLAN_QUERY_KEY, brandPlusApi } from "@/services/brand-plus-api";
import { formatDateDMY } from "@/lib/date-format";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { formatPrice } from "@/utils/format-price";
import type { BillingOrderStatus } from "@/types/billing";

const PENDING_POLL_MS = 3000;
const PENDING_MAX_POLLS = 20;

const UNPAID_MESSAGES: Partial<Record<BillingOrderStatus, string>> = {
  FAILED: "Giao dịch không thành công. Bạn chưa bị trừ tiền cho đơn này.",
  CANCELLED: "Bạn đã hủy thanh toán. Gói Plus chưa được kích hoạt.",
  EXPIRED: "Đơn thanh toán đã hết hạn. Vui lòng tạo thanh toán mới.",
};

function isCancelledReturn(params: URLSearchParams): boolean {
  const status = params.get("status")?.toLowerCase();
  return params.get("cancel") === "true" || status === "cancel" || status === "cancelled";
}

export default function BrandPlanReturnPage() {
  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader title="Kết quả thanh toán" backHref="/brand/plan" backLabel="Gói Plus" />
      <PageSuspense>
        <BrandPlanReturnContent />
      </PageSuspense>
    </PortalLayout>
  );
}

function BrandPlanReturnContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const rawCode = searchParams.get("orderCode");
  const orderCode = rawCode && /^\d+$/.test(rawCode) ? Number(rawCode) : null;
  const cancelled = isCancelledReturn(searchParams);

  const queryKey = ["brand-plan-order", orderCode, cancelled] as const;
  const orderQuery = useQuery({
    queryKey,
    queryFn: () => (cancelled ? brandPlusApi.cancelOrder(orderCode!) : brandPlusApi.getOrder(orderCode!)),
    enabled: orderCode !== null,
    retry: 1,
    // The PayOS webhook can land after the redirect, so keep asking while the order is PENDING.
    refetchInterval: (query) =>
      !cancelled && query.state.data?.status === "PENDING" && query.state.dataUpdateCount < PENDING_MAX_POLLS
        ? PENDING_POLL_MS
        : false,
  });
  const order = orderQuery.data;
  const orderStatus = order?.status;
  const pollsExhausted =
    orderStatus === "PENDING" && (queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0) >= PENDING_MAX_POLLS;

  useEffect(() => {
    if (orderStatus === "PAID") {
      void queryClient.invalidateQueries({ queryKey: BRAND_PLAN_QUERY_KEY });
    }
  }, [orderStatus, queryClient]);

  const errorMessage =
    orderCode === null
      ? "Không tìm thấy mã đơn thanh toán."
      : orderQuery.isError
        ? getUserErrorMessage(orderQuery.error, "Có lỗi xảy ra khi kiểm tra thanh toán.")
        : orderStatus
          ? (UNPAID_MESSAGES[orderStatus] ?? null)
          : null;
  const view = errorMessage
    ? "failed"
    : orderStatus === "PAID"
      ? "success"
      : pollsExhausted || (cancelled && orderStatus === "PENDING")
        ? "pending"
        : "loading";

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-5 text-center">
      {view === "loading" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Đang xác nhận thanh toán...</h2>
          <p className="text-muted-foreground">Vui lòng không đóng trang này.</p>
        </>
      )}

      {view === "success" && (
        <>
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Thanh toán thành công!</h2>
          <p className="text-muted-foreground">
            Đã nhận {formatPrice(order?.amountVnd ?? 0)} cho {order?.planName ?? "FitMe Brand Plus"}.
            {order?.plusEndsAt && <> Gói Plus của bạn hoạt động đến {formatDateDMY(order.plusEndsAt)}.</>}
          </p>
          <Button asChild className="rounded-full">
            <Link href="/brand/plan">Về trang Gói Plus</Link>
          </Button>
        </>
      )}

      {view === "pending" && (
        <>
          <div className="rounded-full bg-amber-100 p-3">
            <Clock className="h-12 w-12 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold">Đang chờ xác nhận thanh toán</h2>
          <p className="max-w-md text-muted-foreground">
            Cổng thanh toán chưa gửi xác nhận cho đơn này. Nếu bạn đã chuyển khoản, gói Plus sẽ được kích hoạt tự
            động khi FitMe nhận được xác nhận.
          </p>
          <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
            <Button className="w-full rounded-full" onClick={() => void orderQuery.refetch()}>
              Kiểm tra lại
            </Button>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href="/brand/plan">Về trang Gói Plus</Link>
            </Button>
          </div>
        </>
      )}

      {view === "failed" && (
        <>
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold">Thanh toán chưa hoàn tất</h2>
          <p className="max-w-md text-muted-foreground">{errorMessage}</p>
          <Button asChild className="rounded-full">
            <Link href="/brand/plan">Về trang Gói Plus</Link>
          </Button>
        </>
      )}
    </div>
  );
}
