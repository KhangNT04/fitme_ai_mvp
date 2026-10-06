"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Package,
  CheckCircle2,
  MousePointerClick,
  Percent,
  Shirt,
  Sparkles,
  TrendingUp,
  Users,
  UserCheck,
} from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { formatPercent } from "@/utils/format-price";
import { funnelSteps } from "@/lib/brand-leads";
import type { CustomerFunnel, ProductCustomers } from "@/types/analytics";

function CustomerFunnelCard({ funnel }: { funnel: CustomerFunnel | undefined }) {
  const steps = funnelSteps(funnel);
  const top = Math.max(1, steps[0].value);
  return (
    <section className="surface-card rounded-2xl p-4 sm:p-5" data-testid="brand-customer-funnel">
      <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">Phễu khách hàng 30 ngày</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{step.label}</span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{step.value}</span>
                {step.rate !== null && ` · ${formatPercent(step.rate)}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (step.value / top) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TopTryOnProducts({ products }: { products: ProductCustomers[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">Sản phẩm được thử nhiều nhất (30 ngày)</h2>
      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Chưa có khách thử đồ sản phẩm của bạn trong 30 ngày qua.
        </p>
      ) : (
        <PortalDataTable showOnMobile>
          <PortalDataTableHead>
            <tr>
              <th className={portalTableThClass}>Sản phẩm</th>
              <th className={portalTableThClass}>Khách thử đồ</th>
            </tr>
          </PortalDataTableHead>
          <PortalDataTableBody>
            {products.map((p) => (
              <tr key={p.productId}>
                <td className={portalTableTdClass}>{p.productName}</td>
                <td className={`${portalTableTdClass} tabular-nums`}>{p.customers}</td>
              </tr>
            ))}
          </PortalDataTableBody>
        </PortalDataTable>
      )}
    </section>
  );
}

export default function BrandDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-dashboard"],
    queryFn: () => brandApi.getDashboard(),
  });

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Tổng quan"
        description="Số liệu sản phẩm, lượt click mua sang cửa hàng của bạn và hiệu quả thử mặc AI."
      />

      {isLoading && <LoadingSkeleton count={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <div className="space-y-6">
          <StatCardGrid className="lg:grid-cols-3 xl:grid-cols-4">
            <StatCard label="Tổng sản phẩm" value={data.totalProducts} icon={<Package className="h-5 w-5" />} tone="violet" />
            <StatCard label="Đang hoạt động" value={data.activeProducts} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
            <StatCard label="Lượt click mua" value={data.buyClicks} icon={<MousePointerClick className="h-5 w-5" />} tone="sky" />
            <StatCard label="CTR" value={formatPercent(data.clickThroughRate)} icon={<Percent className="h-5 w-5" />} tone="amber" />
            <StatCard label="Lượt thử AI" value={data.tryOnAttempts} icon={<Shirt className="h-5 w-5" />} tone="indigo" />
            <StatCard label="Try-on → Mua" value={formatPercent(data.tryOnToBuyRate)} icon={<TrendingUp className="h-5 w-5" />} tone="rose" />
            <StatCard label="AI gợi ý" value={data.aiRecommendedProducts} icon={<Sparkles className="h-5 w-5" />} tone="violet" />
            <StatCard label="Khách thử đồ 7 ngày" value={data.tryOnCustomers7d ?? 0} icon={<UserCheck className="h-5 w-5" />} tone="emerald" />
            <StatCard label="Khách thử đồ 30 ngày" value={data.tryOnCustomers30d ?? 0} icon={<Users className="h-5 w-5" />} tone="sky" />
          </StatCardGrid>

          <div className="grid gap-6 lg:grid-cols-2">
            <CustomerFunnelCard funnel={data.funnel30d} />
            <TopTryOnProducts products={data.topTryOnProducts ?? []} />
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
