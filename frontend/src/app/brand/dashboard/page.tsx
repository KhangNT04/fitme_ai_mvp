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
import { PortalBrandPage } from "@/components/portal/PortalBrandPage";
import { PortalSection } from "@/components/portal/PortalSection";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
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
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5" data-testid="brand-customer-funnel">
      <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">Phễu khách hàng 30 ngày</h3>
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
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.min(100, (step.value / top) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TopTryOnProducts({ products }: { products: ProductCustomers[] }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">
        Sản phẩm được thử nhiều nhất (30 ngày)
      </h3>
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
    </div>
  );
}

export default function BrandDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-dashboard"],
    queryFn: () => brandApi.getDashboard(),
  });

  return (
    <PortalBrandPage
      title="Tổng quan"
      description="Nhìn nhanh hiệu quả bán và thử mặc AI, rồi đào sâu phễu khách hàng."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
    >
      {data && (
        <div className="space-y-8">
          <PortalSection
            title="Kết quả chính"
            description="Ba chỉ số phản ánh trực tiếp doanh thu và chuyển đổi."
          >
            <StatCardGrid className="lg:grid-cols-3">
              <StatCard
                label="Đang hoạt động"
                value={data.activeProducts}
                sub={`${data.totalProducts} sản phẩm tổng`}
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="emerald"
              />
              <StatCard
                label="Lượt click mua"
                value={data.buyClicks}
                sub={`CTR ${formatPercent(data.clickThroughRate)}`}
                icon={<MousePointerClick className="h-5 w-5" />}
                tone="sky"
              />
              <StatCard
                label="Try-on → Mua"
                value={formatPercent(data.tryOnToBuyRate)}
                sub={`${data.tryOnAttempts} lượt thử AI`}
                icon={<TrendingUp className="h-5 w-5" />}
                tone="rose"
              />
            </StatCardGrid>
          </PortalSection>

          <PortalSection title="Hoạt động bổ sung">
            <StatCardGrid>
              <StatCard
                label="Tổng sản phẩm"
                value={data.totalProducts}
                icon={<Package className="h-5 w-5" />}
                tone="violet"
              />
              <StatCard
                label="CTR"
                value={formatPercent(data.clickThroughRate)}
                icon={<Percent className="h-5 w-5" />}
                tone="amber"
              />
              <StatCard
                label="Lượt thử AI"
                value={data.tryOnAttempts}
                icon={<Shirt className="h-5 w-5" />}
                tone="indigo"
              />
              <StatCard
                label="AI gợi ý"
                value={data.aiRecommendedProducts}
                icon={<Sparkles className="h-5 w-5" />}
                tone="violet"
              />
              <StatCard
                label="Khách thử 7 ngày"
                value={data.tryOnCustomers7d ?? 0}
                icon={<UserCheck className="h-5 w-5" />}
                tone="emerald"
              />
              <StatCard
                label="Khách thử 30 ngày"
                value={data.tryOnCustomers30d ?? 0}
                icon={<Users className="h-5 w-5" />}
                tone="sky"
              />
            </StatCardGrid>
          </PortalSection>

          <PortalSection title="Khách hàng & sản phẩm nổi bật">
            <div className="grid gap-6 lg:grid-cols-2">
              <CustomerFunnelCard funnel={data.funnel30d} />
              <TopTryOnProducts products={data.topTryOnProducts ?? []} />
            </div>
          </PortalSection>
        </div>
      )}
    </PortalBrandPage>
  );
}
