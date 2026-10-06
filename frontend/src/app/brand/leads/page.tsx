"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Crown, Users } from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { BRAND_LEADS_QUERY_KEY, brandLeadApi } from "@/services/brand-lead-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import {
  DEFAULT_LEAD_FILTERS,
  leadCustomer,
  leadDateRangeError,
  leadVariantLabel,
  withLeadSold,
} from "@/lib/brand-leads";
import { formatDateTimeDMY } from "@/lib/date-format";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import type { BrandLeadFilters, BrandLeadPage, BrandLeadSummary, LeadSoldFilter } from "@/types/brand-lead";

const selectClass = "flex h-10 min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm";

const SOLD_OPTIONS: { value: LeadSoldFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "sold", label: "Đã bán" },
  { value: "unsold", label: "Chưa bán" },
];

function LeadSummaryCards({ summary }: { summary: BrandLeadSummary }) {
  return (
    <StatCardGrid className="lg:grid-cols-3">
      <StatCard label="Tổng khách quan tâm" value={summary.total} icon={<Users className="h-5 w-5" />} tone="violet" />
      <StatCard label="30 ngày qua" value={summary.last30Days} icon={<CalendarClock className="h-5 w-5" />} tone="sky" />
      <StatCard label="Đã bán" value={summary.sold} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
    </StatCardGrid>
  );
}

function PlusUpgradeCard() {
  return (
    <section className="surface-card rounded-2xl p-5 sm:p-6" data-testid="leads-plus-upsell">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
          <Crown className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-2">
          <h2 className="font-display text-base font-semibold text-foreground">Xem chi tiết khách quan tâm với Brand Plus</h2>
          <p className="text-sm text-muted-foreground">
            Khách đã đồng ý chia sẻ tên và email khi bấm mua sản phẩm của bạn. Nâng cấp FitMe Brand Plus để xem danh sách,
            liên hệ tư vấn và đánh dấu đơn đã bán.
          </p>
          <Button asChild className="rounded-full">
            <Link href="/brand/plan">Nâng cấp Brand Plus</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function BrandLeadsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BrandLeadFilters>(DEFAULT_LEAD_FILTERS);
  const dateError = leadDateRangeError(filters.from, filters.to);
  const queryKey = [...BRAND_LEADS_QUERY_KEY, filters] as const;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => brandLeadApi.list(filters),
    enabled: !dateError,
    placeholderData: (previous) => previous,
  });

  const { data: products } = useQuery({
    queryKey: ["brand-products"],
    queryFn: () => brandApi.getProducts(),
    enabled: data?.plusRequired === false,
  });

  const markSold = useMutation({
    mutationFn: ({ id, sold }: { id: string; sold: boolean }) => brandLeadApi.markSold(id, sold),
    onMutate: async ({ id, sold }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BrandLeadPage>(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, withLeadSold(previous, id, sold ? new Date().toISOString() : null));
      }
      return { previous };
    },
    onError: (e: unknown, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error(getUserErrorMessage(e, "Không cập nhật được trạng thái đã bán"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: BRAND_LEADS_QUERY_KEY }),
  });

  const updateFilters = (patch: Partial<BrandLeadFilters>) => setFilters((f) => ({ ...f, ...patch, page: 0 }));

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Khách quan tâm"
        description="Khách đã đồng ý chia sẻ tên và email khi bấm mua sản phẩm của bạn, để bạn liên hệ tư vấn và xác nhận đơn."
      />

      {isLoading && <LoadingSkeleton count={3} />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <div className="space-y-6">
          <LeadSummaryCards summary={data.summary} />

          {data.plusRequired ? (
            <PlusUpgradeCard />
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-from">Từ ngày</Label>
                  <Input
                    id="lead-from"
                    type="date"
                    value={filters.from}
                    max={filters.to || undefined}
                    onChange={(e) => updateFilters({ from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-to">Đến ngày</Label>
                  <Input
                    id="lead-to"
                    type="date"
                    value={filters.to}
                    min={filters.from || undefined}
                    onChange={(e) => updateFilters({ to: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-product">Sản phẩm</Label>
                  <select
                    id="lead-product"
                    className={selectClass}
                    value={filters.productId}
                    onChange={(e) => updateFilters({ productId: e.target.value })}
                  >
                    <option value="">Tất cả sản phẩm</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-sold">Trạng thái</Label>
                  <select
                    id="lead-sold"
                    className={selectClass}
                    value={filters.sold}
                    onChange={(e) => updateFilters({ sold: e.target.value as LeadSoldFilter })}
                  >
                    {SOLD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="outline" onClick={() => setFilters(DEFAULT_LEAD_FILTERS)}>
                  Xóa bộ lọc
                </Button>
              </div>
              {dateError && (
                <p role="alert" className="text-sm text-red-600">
                  {dateError}
                </p>
              )}

              {data.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                  Chưa có khách quan tâm nào khớp bộ lọc.
                </p>
              ) : (
                <PortalDataTable showOnMobile className={cn(isFetching && "opacity-70 transition-opacity")}>
                  <PortalDataTableHead>
                    <tr>
                      <th className={portalTableThClass}>Tên</th>
                      <th className={portalTableThClass}>Email</th>
                      <th className={portalTableThClass}>Sản phẩm</th>
                      <th className={portalTableThClass}>Size / màu</th>
                      <th className={portalTableThClass}>Thời gian</th>
                      <th className={portalTableThClass}>Đã bán</th>
                    </tr>
                  </PortalDataTableHead>
                  <PortalDataTableBody>
                    {data.items.map((lead) => {
                      const customer = leadCustomer(lead);
                      return (
                        <tr key={lead.id}>
                          <td className={cn(portalTableTdClass, customer.hidden && "italic text-muted-foreground")}>
                            {customer.name}
                          </td>
                          <td className={portalTableTdClass}>
                            {customer.email ? (
                              <a href={`mailto:${customer.email}`} className="text-primary underline-offset-2 hover:underline">
                                {customer.email}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={portalTableTdClass}>{lead.productName}</td>
                          <td className={portalTableTdClass}>{leadVariantLabel(lead)}</td>
                          <td className={cn(portalTableTdClass, "whitespace-nowrap")}>{formatDateTimeDMY(lead.createdAt)}</td>
                          <td className={portalTableTdClass}>
                            <Checkbox
                              checked={!!lead.confirmedSoldAt}
                              aria-label={`Đánh dấu đã bán: ${lead.productName}`}
                              onCheckedChange={(v) => markSold.mutate({ id: lead.id, sold: v === true })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </PortalDataTableBody>
                </PortalDataTable>
              )}

              {data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Trang trước"
                    disabled={filters.page === 0}
                    onClick={() => setFilters((f) => ({ ...f, page: Math.max(0, f.page - 1) }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Trang {filters.page + 1} / {data.totalPages} · {data.totalItems} khách
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Trang sau"
                    disabled={filters.page + 1 >= data.totalPages}
                    onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
