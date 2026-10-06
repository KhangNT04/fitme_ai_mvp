"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PageSuspense } from "@/components/common/PageSuspense";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import {
  PortalActionButton,
  PortalActionGroup,
  PortalActionLink,
} from "@/components/portal/PortalActionButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/utils/format-price";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
  portalTableActionsClass,
} from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";
import { formatDateDMY } from "@/lib/date-format";
import { formatDiscountWindow } from "@/lib/plan-pricing";
import type { BillingPlan, PlanAudience } from "@/types/billing";

type PlanTab = "consumer" | "brand";

const TAB_AUDIENCE: Record<PlanTab, PlanAudience> = { consumer: "CONSUMER", brand: "BRAND" };

export default function AdminBillingPlansPage() {
  return (
    <PageSuspense>
      <AdminBillingPlansContent />
    </PageSuspense>
  );
}

function AdminBillingPlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PlanTab>(searchParams.get("tab") === "brand" ? "brand" : "consumer");

  return (
    <PortalAdminPage
      title="Gói dịch vụ"
      description="Gói trả phí cho người dùng (FitMe Premium, top-up Fitken) và cho brand (Brand Plus)."
      headerActions={
        <Button size="sm" asChild>
          <Link href={`/admin/billing/plans/new?audience=${TAB_AUDIENCE[tab]}`}>Thêm gói</Link>
        </Button>
      }
    >
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = value as PlanTab;
          setTab(next);
          router.replace(`/admin/billing/plans?tab=${next}`, { scroll: false });
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="consumer">Gói người dùng</TabsTrigger>
          <TabsTrigger value="brand">Gói brand</TabsTrigger>
        </TabsList>
        <TabsContent value="consumer">
          <PlanList audience="CONSUMER" />
        </TabsContent>
        <TabsContent value="brand" className="space-y-8">
          <PlanList audience="BRAND" />
          <BrandSubscriptionList />
        </TabsContent>
      </Tabs>
    </PortalAdminPage>
  );
}

function PriceCell({ plan }: { plan: BillingPlan }) {
  const effective = plan.effectivePriceVnd ?? plan.priceVnd;
  if (plan.discountActive && effective !== plan.priceVnd) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-2">
        <span className="text-muted-foreground line-through">{formatPrice(plan.priceVnd)}</span>
        <span className="font-medium text-foreground">{formatPrice(effective)}</span>
        <Badge variant="outline">-{plan.discountPercent}%</Badge>
      </span>
    );
  }
  return <span>{formatPrice(plan.priceVnd)}</span>;
}

function discountNote(plan: BillingPlan): string | null {
  if (!plan.discountPercent || plan.discountPercent <= 0) return null;
  const windowLabel = formatDiscountWindow(plan.discountStartsAt, plan.discountEndsAt);
  const label = plan.discountActive ? "Đang giảm" : "Giảm chưa áp dụng";
  return `${label} ${plan.discountPercent}%${windowLabel ? ` ${windowLabel}` : ""}`;
}

function periodLabel(plan: BillingPlan): string {
  return plan.planType === "TOPUP" ? "Top-up một lần" : `${plan.billingPeriodDays ?? 30} ngày`;
}

function PlanList({ audience }: { audience: PlanAudience }) {
  const queryClient = useQueryClient();
  const isBrand = audience === "BRAND";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-billing-plans", audience],
    queryFn: () => adminBillingApi.getPlans(audience),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminBillingApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      actionFeedback({ successMessage: "Đã xóa gói" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa gói" }).onError,
  });

  const confirmDelete = (plan: BillingPlan) => {
    if (window.confirm(`Xóa gói "${plan.name}"?`)) {
      remove.mutate(plan.id);
    }
  };

  if (isLoading) return <LoadingSkeleton type="list" />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!data?.length) {
    return (
      <EmptyState
        title="Chưa có gói nào"
        description={
          isBrand
            ? "Tạo gói Brand Plus để brand đăng ký qua PayOS."
            : "Tạo gói Premium để người dùng đăng ký qua PayOS."
        }
      />
    );
  }

  return (
    <>
      <div className={portalCardListClass}>
        {data.map((plan) => (
          <article key={plan.id} className={portalCardClass}>
            <div className={portalCardRowClass}>
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {plan.name} <span className="text-muted-foreground">({plan.code})</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <PriceCell plan={plan} />
                  {!isBrand && ` · ${plan.fitkenAmount} Fitken`} · {periodLabel(plan)}
                </p>
                {discountNote(plan) && (
                  <p className="mt-1 text-xs text-muted-foreground">{discountNote(plan)}</p>
                )}
                <Badge variant="outline" className="mt-2">
                  {plan.active ? "Đang bán" : "Tắt"}
                </Badge>
              </div>
            </div>
            <PortalActionGroup className={portalCardActionsClass}>
              <PortalActionLink href={`/admin/billing/plans/${plan.id}/edit`} variant="edit">
                Sửa
              </PortalActionLink>
              <PortalActionButton variant="delete" onClick={() => confirmDelete(plan)}>
                Xóa
              </PortalActionButton>
            </PortalActionGroup>
          </article>
        ))}
      </div>

      <PortalDataTable>
        <PortalDataTableHead>
          <tr>
            <th className={portalTableThClass}>Tên gói</th>
            <th className={portalTableThClass}>Mã</th>
            <th className={portalTableThClass}>Giá hiện tại</th>
            {!isBrand && <th className={portalTableThClass}>Fitken</th>}
            <th className={portalTableThClass}>Chu kỳ</th>
            <th className={portalTableThClass}>Trạng thái</th>
            <th className={portalTableThClass}>Thao tác</th>
          </tr>
        </PortalDataTableHead>
        <PortalDataTableBody>
          {data.map((plan) => (
            <tr key={plan.id}>
              <td className={portalTableTdClass}>{plan.name}</td>
              <td className={portalTableTdClass}>{plan.code}</td>
              <td className={portalTableTdClass}>
                <PriceCell plan={plan} />
                {discountNote(plan) && (
                  <p className="mt-1 text-xs text-muted-foreground">{discountNote(plan)}</p>
                )}
              </td>
              {!isBrand && <td className={portalTableTdClass}>{plan.fitkenAmount}</td>}
              <td className={portalTableTdClass}>{periodLabel(plan)}</td>
              <td className={portalTableTdClass}>
                <Badge variant="outline">{plan.active ? "Đang bán" : "Tắt"}</Badge>
              </td>
              <td className={portalTableTdClass}>
                <PortalActionGroup className={portalTableActionsClass}>
                  <PortalActionLink href={`/admin/billing/plans/${plan.id}/edit`} variant="edit">
                    Sửa
                  </PortalActionLink>
                  <PortalActionButton variant="delete" onClick={() => confirmDelete(plan)}>
                    Xóa
                  </PortalActionButton>
                </PortalActionGroup>
              </td>
            </tr>
          ))}
        </PortalDataTableBody>
      </PortalDataTable>
    </>
  );
}

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
};

function BrandSubscriptionList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-brand-subscriptions"],
    queryFn: () => adminBillingApi.getBrandSubscriptions(),
  });

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Brand đã mua Plus</h2>
      {isLoading && <LoadingSkeleton type="list" />}
      {!!error && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState title="Chưa có brand nào mua Plus" description="Brand thanh toán gói Plus sẽ xuất hiện tại đây." />
      )}
      {data && data.length > 0 && (
        <PortalDataTable showOnMobile>
          <PortalDataTableHead>
            <tr>
              <th className={portalTableThClass}>Brand</th>
              <th className={portalTableThClass}>Trạng thái</th>
              <th className={portalTableThClass}>Hết hạn</th>
            </tr>
          </PortalDataTableHead>
          <PortalDataTableBody>
            {data.map((sub) => (
              <tr key={sub.brandId}>
                <td className={portalTableTdClass}>{sub.brandName ?? sub.brandId}</td>
                <td className={portalTableTdClass}>
                  <Badge variant={sub.active ? "success" : "outline"}>
                    {sub.active
                      ? SUBSCRIPTION_STATUS_LABEL.ACTIVE
                      : sub.status === "ACTIVE"
                        ? SUBSCRIPTION_STATUS_LABEL.EXPIRED
                        : (SUBSCRIPTION_STATUS_LABEL[sub.status] ?? sub.status)}
                  </Badge>
                </td>
                <td className={portalTableTdClass}>{formatDateDMY(sub.endsAt)}</td>
              </tr>
            ))}
          </PortalDataTableBody>
        </PortalDataTable>
      )}
    </section>
  );
}
