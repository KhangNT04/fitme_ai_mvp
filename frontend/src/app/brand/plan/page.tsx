"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Crown, Info, Sparkles, Ticket, Users } from "lucide-react";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BRAND_PLAN_QUERY_KEY,
  BRAND_PLAN_QUOTE_QUERY_KEY,
  BRAND_VOUCHERS_QUERY_KEY,
  brandPlusApi,
} from "@/services/brand-plus-api";
import { formatDateDMY } from "@/lib/date-format";
import { formatDiscountWindow } from "@/lib/plan-pricing";
import {
  discountSourceLabel,
  usableVouchers,
  voucherExpiryLabel,
  voucherStatusLabel,
  voucherStatusVariant,
} from "@/lib/brand-voucher";
import { actionFeedback } from "@/lib/action-feedback";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/format-price";
import type { BrandPlusQuote, BrandPlusStatus, BrandVoucher, PlanDiscountSource } from "@/types/billing";

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
  const queryClient = useQueryClient();
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: BRAND_PLAN_QUERY_KEY,
    queryFn: () => brandPlusApi.getStatus(),
  });
  const vouchersQuery = useQuery({
    queryKey: BRAND_VOUCHERS_QUERY_KEY,
    queryFn: () => brandPlusApi.getVouchers(),
  });

  const vouchers = vouchersQuery.data ?? [];
  const usable = usableVouchers(vouchers);
  const voucherId = selectedVoucherId && usable.some((v) => v.id === selectedVoucherId) ? selectedVoucherId : null;

  const quoteQuery = useQuery({
    queryKey: [...BRAND_PLAN_QUOTE_QUERY_KEY, voucherId ?? "none"],
    queryFn: () => brandPlusApi.getQuote(voucherId),
    enabled: !!data?.planAvailable,
    retry: false,
  });

  const refreshPlan = () => {
    void queryClient.invalidateQueries({ queryKey: BRAND_PLAN_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: BRAND_VOUCHERS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: BRAND_PLAN_QUOTE_QUERY_KEY });
  };

  const checkout = useMutation({
    mutationFn: () => brandPlusApi.checkout(voucherId),
    onSuccess: (res) => {
      window.location.assign(res.checkoutUrl);
    },
    onError: (err) => {
      actionFeedback({ errorMessage: "Không thể tạo thanh toán" }).onError(err);
      refreshPlan();
    },
  });

  const cancelPending = useMutation({
    mutationFn: (orderCode: number) => brandPlusApi.cancelOrder(orderCode),
    onSuccess: () => {
      actionFeedback({ successMessage: "Đã hủy đơn chờ thanh toán" }).onSuccess();
      refreshPlan();
    },
    onError: actionFeedback({ errorMessage: "Không thể hủy đơn" }).onError,
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
            <StatusCard
              status={data}
              cancelling={cancelPending.isPending}
              onCancelPending={(orderCode) => cancelPending.mutate(orderCode)}
            />

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

            {vouchers.length > 0 && <MyVouchersCard vouchers={vouchers} />}
          </div>

          <div className="space-y-6">
            <PriceCard
              status={data}
              quote={quoteQuery.data}
              quoteError={quoteQuery.error}
              loading={checkout.isPending}
              blocked={!!voucherId && quoteQuery.isError}
              onCheckout={() => checkout.mutate()}
            />

            {data.planAvailable && (
              <VoucherPicker
                vouchers={usable}
                loading={vouchersQuery.isLoading}
                selectedId={voucherId}
                onSelect={setSelectedVoucherId}
              />
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function StatusCard({
  status,
  cancelling,
  onCancelPending,
}: {
  status: BrandPlusStatus;
  cancelling: boolean;
  onCancelPending: (orderCode: number) => void;
}) {
  const pending = status.pendingOrder;
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
        {pending && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p>
                Có một thanh toán {formatPrice(pending.amountVnd)} đang chờ xác nhận
                {pending.voucherCode ? ` (dùng voucher ${pending.voucherCode})` : ""}.
                {pending.checkoutUrl && (
                  <>
                    {" "}
                    <a href={pending.checkoutUrl} className="font-medium text-primary underline">
                      Tiếp tục thanh toán
                    </a>
                  </>
                )}
              </p>
              {pending.voucherCode && (
                <p className="text-xs">Voucher được giữ cho đơn này cho tới khi đơn được thanh toán, hủy hoặc hết hạn.</p>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={cancelling}
                onClick={() => onCancelPending(pending.orderCode)}
              >
                {cancelling ? "Đang hủy..." : "Hủy đơn"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PriceCard({
  status,
  quote,
  quoteError,
  loading,
  blocked,
  onCheckout,
}: {
  status: BrandPlusStatus;
  quote?: BrandPlusQuote;
  quoteError: unknown;
  loading: boolean;
  blocked: boolean;
  onCheckout: () => void;
}) {
  const period = quote?.billingPeriodDays ?? status.billingPeriodDays ?? 30;
  const listPrice = quote?.listPriceVnd ?? status.listPriceVnd;
  const appliedPercent = quote?.appliedPercent ?? (status.discountActive ? (status.discountPercent ?? 0) : 0);
  const finalPrice = quote?.amountVnd ?? status.effectivePriceVnd;
  const source: PlanDiscountSource = quote?.source ?? (appliedPercent > 0 ? "WINDOW" : "NONE");
  const discounted = appliedPercent > 0 && finalPrice !== listPrice;
  const windowLabel = formatDiscountWindow(status.discountStartsAt, status.discountEndsAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{status.planName ?? "FitMe Brand Plus"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          {discounted && <p className="text-sm text-muted-foreground line-through">{formatPrice(listPrice)}</p>}
          <p className="text-3xl font-bold text-foreground" data-testid="brand-plan-final-price">
            {formatPrice(finalPrice)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {period} ngày</span>
          </p>
          {discounted && (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              Giảm {appliedPercent}% · {discountSourceLabel(source, quote?.voucherCode)}
              {source === "WINDOW" && windowLabel ? ` ${windowLabel}` : ""}
            </p>
          )}
        </div>

        {discounted && (
          <dl className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Giá niêm yết</dt>
              <dd>{formatPrice(listPrice)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{discountSourceLabel(source, quote?.voucherCode)}</dt>
              <dd className="text-emerald-700">-{formatPrice(listPrice - finalPrice)}</dd>
            </div>
            <div className="flex justify-between gap-3 font-semibold">
              <dt>Thành tiền</dt>
              <dd>{formatPrice(finalPrice)}</dd>
            </div>
          </dl>
        )}

        {quote?.voucherIgnoredReason && (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{quote.voucherIgnoredReason}</span>
          </p>
        )}
        {!!quoteError && (
          <p className="text-sm text-destructive">{getUserErrorMessage(quoteError, "Không tính được giá với voucher này")}</p>
        )}

        <Button className="w-full" disabled={!status.planAvailable || loading || blocked} onClick={onCheckout}>
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

function VoucherPicker({
  vouchers,
  loading,
  selectedId,
  onSelect,
}: {
  vouchers: BrandVoucher[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const optionClass = (checked: boolean) =>
    cn(
      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
    );

  return (
    <Card data-testid="brand-plan-voucher-picker">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="h-4 w-4" />
          Voucher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <LoadingSkeleton type="list" />}
        {!loading && vouchers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Bạn chưa có voucher nào dùng được. FitMe sẽ gửi voucher cho brand trong các chương trình ưu đãi.
          </p>
        )}
        {vouchers.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="sr-only">Chọn voucher</legend>
            <label className={optionClass(selectedId === null)}>
              <input
                type="radio"
                name="brand-plan-voucher"
                className="h-4 w-4 accent-primary"
                checked={selectedId === null}
                onChange={() => onSelect(null)}
              />
              <span>Không dùng voucher</span>
            </label>
            {vouchers.map((voucher) => (
              <label key={voucher.id} className={optionClass(selectedId === voucher.id)}>
                <input
                  type="radio"
                  name="brand-plan-voucher"
                  className="h-4 w-4 accent-primary"
                  checked={selectedId === voucher.id}
                  onChange={() => onSelect(voucher.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs font-semibold">{voucher.code}</span>
                  <span className="block text-xs text-muted-foreground">{voucherExpiryLabel(voucher.expiresAt)}</span>
                </span>
                <Badge variant="success">-{voucher.discountPercent}%</Badge>
              </label>
            ))}
          </fieldset>
        )}
        <p className="text-xs text-muted-foreground">
          Mỗi lần mua dùng tối đa một voucher. Voucher không cộng dồn với chương trình giảm giá đang chạy: FitMe tự áp
          dụng mức giảm lớn hơn và giữ lại voucher nếu không dùng tới.
        </p>
      </CardContent>
    </Card>
  );
}

function voucherNote(voucher: BrandVoucher): string {
  if (voucher.status === "RESERVED" && voucher.reservedOrderCode) {
    return `Đang giữ cho đơn #${voucher.reservedOrderCode}`;
  }
  if (voucher.status === "USED" && voucher.usedAt) return `Đã dùng ngày ${formatDateDMY(voucher.usedAt)}`;
  return voucherExpiryLabel(voucher.expiresAt);
}

function MyVouchersCard({ vouchers }: { vouchers: BrandVoucher[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="h-4 w-4" />
          Voucher của bạn
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60" aria-label="Voucher của bạn">
          {vouchers.map((voucher) => (
            <li
              key={voucher.id}
              className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm", !voucher.usable && "opacity-60")}
            >
              <span className="font-mono text-xs font-semibold">{voucher.code}</span>
              <span className="text-muted-foreground">-{voucher.discountPercent}%</span>
              <Badge variant={voucherStatusVariant(voucher.status)}>{voucherStatusLabel(voucher.status)}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{voucherNote(voucher)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
