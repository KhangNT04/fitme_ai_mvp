"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Package, Sparkles, Zap } from "lucide-react";
import { billingApi } from "@/services/billing-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { formatPrice } from "@/utils/format-price";
import { portalCardClass, portalCardListClass } from "@/lib/design-tokens";
import type { BillingPlan } from "@/types/billing";
import { actionFeedback } from "@/lib/action-feedback";

function PlanCard({
  plan,
  onBuy,
  loading,
}: {
  plan: BillingPlan;
  onBuy: (plan: BillingPlan) => void;
  loading: boolean;
}) {
  const isSubscription = plan.planType === "SUBSCRIPTION";
  return (
    <article className={portalCardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            <Badge variant="outline">{isSubscription ? "Gói tháng" : "Top-up"}</Badge>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatPrice(plan.priceVnd)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.quotaAmount.toLocaleString("vi-VN")} lượt thử AI 2D
            {isSubscription ? " / tháng" : ""}
          </p>
          {plan.includesDashboard && (
            <p className="mt-2 text-sm text-emerald-700">Bao gồm dashboard phân tích</p>
          )}
          {!plan.includesDashboard && (
            <p className="mt-2 text-sm text-muted-foreground">Không bao gồm dashboard</p>
          )}
        </div>
        <Button onClick={() => onBuy(plan)} disabled={loading}>
          {loading ? "Đang xử lý..." : "Mua gói"}
        </Button>
      </div>
    </article>
  );
}

export default function BrandBillingPage() {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["brand-billing-summary"],
    queryFn: () => billingApi.getSummary(),
  });
  const plansQuery = useQuery({
    queryKey: ["brand-billing-plans"],
    queryFn: () => billingApi.getPlans(),
  });

  const checkout = useMutation({
    mutationFn: (planId: string) => billingApi.checkout(planId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["brand-billing-summary"] });
      if (data.mockPaid) {
        actionFeedback({ successMessage: "Thanh toán demo thành công — lượt đã được cộng." }).onSuccess();
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: actionFeedback({ errorMessage: "Không thể tạo link thanh toán" }).onError,
  });

  const { subscriptions, topups } = useMemo(() => {
    const plans = plansQuery.data ?? [];
    return {
      subscriptions: plans.filter((p) => p.planType === "SUBSCRIPTION"),
      topups: plans.filter((p) => p.planType === "TOPUP"),
    };
  }, [plansQuery.data]);

  const isLoading = summaryQuery.isLoading || plansQuery.isLoading;
  const error = summaryQuery.error || plansQuery.error;

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Gói & Thanh toán"
        description="Quản lý gói thử AI 2D và mua thêm lượt khi cần."
      />

      {isLoading && <LoadingSkeleton count={3} />}
      {error && <ErrorState onRetry={() => { summaryQuery.refetch(); plansQuery.refetch(); }} />}

      {summaryQuery.data && (
        <>
          <StatCardGrid className="mb-8 lg:grid-cols-3">
            <StatCard
              label="Lượt còn lại"
              value={summaryQuery.data.totalRemaining.toLocaleString("vi-VN")}
              icon={<Sparkles className="h-5 w-5" />}
              tone="violet"
            />
            <StatCard
              label="Từ gói tháng"
              value={summaryQuery.data.subscriptionRemaining.toLocaleString("vi-VN")}
              icon={<Package className="h-5 w-5" />}
              tone="sky"
            />
            <StatCard
              label="Từ top-up"
              value={summaryQuery.data.topupRemaining.toLocaleString("vi-VN")}
              icon={<Zap className="h-5 w-5" />}
              tone="amber"
            />
          </StatCardGrid>

          {summaryQuery.data.subscription && (
            <div className={`${portalCardClass} mb-8`}>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">
                  Gói hiện tại: {summaryQuery.data.subscription.planName}
                </p>
                <Badge variant="outline">{summaryQuery.data.subscription.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Hết hạn: {new Date(summaryQuery.data.subscription.expiresAt).toLocaleDateString("vi-VN")}
              </p>
              {!summaryQuery.data.dashboardEnabled && (
                <p className="mt-2 text-sm text-amber-700">
                  Dashboard phân tích chỉ có trong gói tháng đang hoạt động.
                </p>
              )}
            </div>
          )}

          {!summaryQuery.data.dashboardEnabled && summaryQuery.data.totalRemaining === 0 && (
            <div className={`${portalCardClass} mb-8 border-amber-200 bg-amber-50/50`}>
              <p className="font-medium text-amber-900">Chưa có lượt thử AI</p>
              <p className="mt-1 text-sm text-amber-800">
                Sản phẩm của bạn sẽ không xuất hiện trong gợi ý AI và không có nút thử mặc cho đến khi mua gói.
              </p>
            </div>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Gói tháng</h2>
            <div className={portalCardListClass}>
              {subscriptions.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  loading={checkout.isPending}
                  onBuy={(p) => checkout.mutate(p.id)}
                />
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold">Gói tăng cường</h2>
            <p className="text-sm text-muted-foreground">
              Mua thêm lượt bất cứ lúc nào — không bao gồm dashboard phân tích.
            </p>
            <div className={portalCardListClass}>
              {topups.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  loading={checkout.isPending}
                  onBuy={(p) => checkout.mutate(p.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </PortalLayout>
  );
}
