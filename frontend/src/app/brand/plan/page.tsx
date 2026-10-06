"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Crown, Sparkles, Ticket, Users } from "lucide-react";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND_PLAN_QUERY_KEY, brandPlusApi } from "@/services/brand-plus-api";
import { formatDateDMY } from "@/lib/date-format";
import { formatDiscountWindow } from "@/lib/plan-pricing";
import { actionFeedback } from "@/lib/action-feedback";
import { formatPrice } from "@/utils/format-price";
import type { BrandPlusStatus } from "@/types/billing";

const BENEFITS = [
  {
    icon: Sparkles,
    title: "Ưu tiên trong gợi ý phối đồ",
    description: "Sản phẩm của bạn được ưu tiên xuất hiện khi FitMe gợi ý outfit cho khách.",
  },
  {
    icon: CheckCircle2,
    title: "Khách thử đồ AI miễn phí với sản phẩm của bạn",
    description: "Khách thử mặc sản phẩm của brand bằng AI mà không tốn Fitken, giúp tăng khả năng chốt đơn.",
  },
  {
    icon: Users,
    title: "Xem thông tin khách có nhu cầu mua (lead)",
    description: "Biết khách nào đang quan tâm sản phẩm của bạn để chăm sóc và chốt đơn tại cửa hàng.",
  },
];

export default function BrandPlanPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: BRAND_PLAN_QUERY_KEY,
    queryFn: () => brandPlusApi.getStatus(),
  });

  const checkout = useMutation({
    mutationFn: () => brandPlusApi.checkout(),
    onSuccess: (res) => {
      window.location.assign(res.checkoutUrl);
    },
    onError: actionFeedback({ errorMessage: "Không thể tạo thanh toán" }).onError,
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Gói Plus"
        description="Niêm yết sản phẩm trên FitMe luôn miễn phí. FitMe Brand Plus giúp brand bán được nhiều hơn."
      />

      {isLoading && <LoadingSkeleton count={2} />}
      {!!error && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="space-y-6">
            <StatusCard status={data} />

            <Card>
              <CardHeader>
                <CardTitle>Quyền lợi</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {BENEFITS.map(({ icon: Icon, title, description }) => (
                    <li key={title} className="flex gap-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{title}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <PriceCard
              status={data}
              loading={checkout.isPending}
              onCheckout={() => checkout.mutate()}
            />

            {/* Phase 5: brand voucher input goes here. */}
            <Card className="border-dashed" data-testid="brand-plan-voucher-placeholder">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Ticket className="h-4 w-4" />
                  Mã giảm giá
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tính năng nhập mã giảm giá cho brand sắp ra mắt.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function StatusCard({ status }: { status: BrandPlusStatus }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Trạng thái
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {status.active ? (
          <Badge variant="success" className="text-sm">
            Đang hoạt động đến {formatDateDMY(status.endsAt)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-sm">
            Chưa có gói
          </Badge>
        )}
        {!status.active && status.status === "EXPIRED" && status.endsAt && (
          <p className="text-sm text-muted-foreground">Gói Plus trước đã hết hạn ngày {formatDateDMY(status.endsAt)}.</p>
        )}
        {status.pendingOrder && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Có một thanh toán {formatPrice(status.pendingOrder.amountVnd)} đang chờ xác nhận.
              {status.pendingOrder.checkoutUrl && (
                <>
                  {" "}
                  <a href={status.pendingOrder.checkoutUrl} className="font-medium text-primary underline">
                    Tiếp tục thanh toán
                  </a>
                </>
              )}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PriceCard({
  status,
  loading,
  onCheckout,
}: {
  status: BrandPlusStatus;
  loading: boolean;
  onCheckout: () => void;
}) {
  const period = status.billingPeriodDays ?? 30;
  const windowLabel = formatDiscountWindow(status.discountStartsAt, status.discountEndsAt);
  const discounted = status.discountActive && status.effectivePriceVnd !== status.listPriceVnd;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{status.planName ?? "FitMe Brand Plus"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          {discounted && (
            <p className="text-sm text-muted-foreground line-through">{formatPrice(status.listPriceVnd)}</p>
          )}
          <p className="text-3xl font-bold text-foreground">
            {formatPrice(discounted ? status.effectivePriceVnd : status.listPriceVnd)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {period} ngày</span>
          </p>
          {discounted && (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              Giảm {status.discountPercent}%{windowLabel ? ` ${windowLabel}` : ""}
            </p>
          )}
        </div>

        <Button className="w-full" disabled={!status.planAvailable || loading} onClick={onCheckout}>
          {loading ? "Đang chuyển tới PayOS..." : status.active ? "Gia hạn" : "Thanh toán"}
        </Button>
        {!status.planAvailable && (
          <p className="text-sm text-muted-foreground">Gói Plus đang tạm ngưng bán. Vui lòng quay lại sau.</p>
        )}
        {status.active && status.planAvailable && (
          <p className="text-xs text-muted-foreground">
            Gia hạn sẽ cộng thêm {period} ngày tính từ ngày hết hạn hiện tại ({formatDateDMY(status.endsAt)}).
          </p>
        )}
        <p className="text-xs text-muted-foreground">Thanh toán an toàn qua PayOS (chuyển khoản / QR ngân hàng).</p>
      </CardContent>
    </Card>
  );
}
