"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CalendarDays, CalendarRange, Magnet, Repeat, UserMinus } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS, CHART_BAR, CHART_GRID, formatChartNumber } from "@/lib/chart-theme";
import { portalCardClass, portalCardListClass, portalCardRowClass } from "@/lib/design-tokens";
import { formatIsoDay, formatRate, formatWeekRange, heatmapShadeClass } from "@/lib/retention-format";
import { cn } from "@/lib/utils";
import type { RetentionMetrics } from "@/types/analytics";

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-border/60 bg-white shadow-sm">
      <CardHeader className="space-y-1 border-b border-border/40 bg-muted/10 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pb-4 pt-4">{children}</CardContent>
    </Card>
  );
}

function CohortHeatmap({ cohorts }: { cohorts: RetentionMetrics["cohorts"] }) {
  const weeks = cohorts[0]?.rates.length ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="px-2 py-1 text-left font-medium">Tuần đăng ký</th>
            <th className="px-2 py-1 text-right font-medium">Số người</th>
            {Array.from({ length: weeks }, (_, i) => (
              <th key={i} className="px-2 py-1 text-center font-medium">
                Tuần {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.weekStart}>
              <td className="whitespace-nowrap px-2 py-1.5 font-medium">{formatWeekRange(cohort.weekStart)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatChartNumber(cohort.size)}</td>
              {cohort.rates.map((rate, i) => {
                const active = cohort.activeUsers[i];
                return (
                  <td
                    key={i}
                    className={cn("rounded-md px-2 py-1.5 text-center text-xs tabular-nums", heatmapShadeClass(rate))}
                    title={active == null ? "Chưa tới tuần này" : `${active}/${cohort.size} người hoạt động`}
                  >
                    {formatRate(rate, 0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FrequencyChart({ frequency }: { frequency: RetentionMetrics["frequency"] }) {
  const total = frequency.reduce((sum, bucket) => sum + bucket.users, 0);
  const data = frequency.map((bucket) => ({
    ...bucket,
    pct: total > 0 ? `${Math.round((bucket.users / total) * 100)}%` : "0%",
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={36} />
          <Tooltip formatter={(value) => formatChartNumber(Number(value ?? 0))} />
          <Bar dataKey="users" name="Người dùng" fill={CHART_BAR} radius={[2, 2, 0, 0]} maxBarSize={56}>
            <LabelList dataKey="pct" position="top" className="fill-foreground text-[11px]" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopUsers({ users }: { users: RetentionMetrics["topUsers"] }) {
  if (users.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có khách hoạt động trong 30 ngày qua.</p>;
  }
  return (
    <>
      <div className={portalCardListClass}>
        {users.map((user, index) => (
          <article key={user.userId} className={portalCardClass}>
            <div className={portalCardRowClass}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {index + 1}. {user.displayName || "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tư vấn {user.recommendations30d} · Thử đồ {user.tryOns30d} · Bấm mua {user.buyClicks30d}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{user.activeDays30d} ngày</p>
                <p className="text-xs text-muted-foreground">{formatIsoDay(user.lastActiveDate)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <PortalDataTable className="mt-0 sm:mt-0">
        <PortalDataTableHead>
          <tr>
            <th className={portalTableThClass}>#</th>
            <th className={portalTableThClass}>Khách hàng</th>
            <th className={portalTableThClass}>Email</th>
            <th className={portalTableThClass}>Hoạt động gần nhất</th>
            <th className={cn(portalTableThClass, "text-right")}>Số ngày hoạt động</th>
            <th className={cn(portalTableThClass, "text-right")}>Tư vấn AI</th>
            <th className={cn(portalTableThClass, "text-right")}>Thử đồ AI</th>
            <th className={cn(portalTableThClass, "text-right")}>Bấm mua</th>
          </tr>
        </PortalDataTableHead>
        <PortalDataTableBody>
          {users.map((user, index) => (
            <tr key={user.userId}>
              <td className={cn(portalTableTdClass, "tabular-nums text-muted-foreground")}>{index + 1}</td>
              <td className={cn(portalTableTdClass, "font-medium")}>{user.displayName || "—"}</td>
              <td className={portalTableTdClass}>{user.email}</td>
              <td className={cn(portalTableTdClass, "tabular-nums")}>{formatIsoDay(user.lastActiveDate)}</td>
              <td className={cn(portalTableTdClass, "text-right font-semibold tabular-nums")}>{user.activeDays30d}</td>
              <td className={cn(portalTableTdClass, "text-right tabular-nums")}>{user.recommendations30d}</td>
              <td className={cn(portalTableTdClass, "text-right tabular-nums")}>{user.tryOns30d}</td>
              <td className={cn(portalTableTdClass, "text-right tabular-nums")}>{user.buyClicks30d}</td>
            </tr>
          ))}
        </PortalDataTableBody>
      </PortalDataTable>
    </>
  );
}

export default function AdminRetentionPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-retention"],
    queryFn: () => adminApi.getRetention(),
  });

  return (
    <PortalAdminPage
      title="Khách quay lại"
      description="Mức độ quay lại dùng FitMe của khách hàng: hoạt động hằng ngày, tỉ lệ giữ chân theo nhóm đăng ký và khách trung thành nhất."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={data != null && data.totalConsumers === 0}
      emptyTitle="Chưa có khách hàng"
      emptyDescription="Khi khách đăng ký và dùng FitMe, số liệu quay lại sẽ xuất hiện tại đây."
      skeleton="card"
    >
      {data && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Khách hoạt động</h2>
            <StatCardGrid>
              <StatCard label="Hôm nay (DAU)" value={formatChartNumber(data.dau)} sub={formatIsoDay(data.today)} icon={<Activity className="h-5 w-5" />} tone="emerald" />
              <StatCard label="7 ngày (WAU)" value={formatChartNumber(data.wau)} sub="Gồm hôm nay" icon={<CalendarDays className="h-5 w-5" />} tone="sky" />
              <StatCard label="30 ngày (MAU)" value={formatChartNumber(data.mau)} sub={`${formatChartNumber(data.totalConsumers)} khách đã đăng ký`} icon={<CalendarRange className="h-5 w-5" />} tone="indigo" />
              <StatCard label="Độ gắn bó (DAU/MAU)" value={formatRate(data.stickiness)} sub="Khách tháng này quay lại hôm nay" icon={<Magnet className="h-5 w-5" />} tone="violet" />
            </StatCardGrid>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Tỉ lệ giữ chân</h2>
              <p className="text-sm text-muted-foreground">
                Nhóm khách đăng ký trong 30 ngày đã qua đủ N ngày; tỉ lệ = số khách có hoạt động đúng ngày thứ N sau ngày đăng ký.
              </p>
            </div>
            <StatCardGrid className="lg:grid-cols-3">
              {data.retention.map((item) => (
                <StatCard
                  key={item.day}
                  label={`Quay lại ngày ${item.day} (D${item.day})`}
                  value={formatRate(item.rate)}
                  sub={`${formatChartNumber(item.retained)}/${formatChartNumber(item.cohortSize)} khách · đăng ký ${formatIsoDay(item.cohortFrom)} – ${formatIsoDay(item.cohortTo)}`}
                  icon={<Repeat className="h-5 w-5" />}
                  tone={item.day === 1 ? "emerald" : item.day === 7 ? "sky" : "amber"}
                />
              ))}
            </StatCardGrid>
          </section>

          <section>
            <ChartCard
              title="Nhóm đăng ký theo tuần"
              description="Mỗi hàng là khách đăng ký trong một tuần (thứ Hai – Chủ nhật, giờ Việt Nam); ô là % khách của nhóm có hoạt động ở tuần thứ N sau đó. Ô trống = tuần chưa tới."
            >
              <CohortHeatmap cohorts={data.cohorts} />
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Tần suất hoạt động" description="Số ngày có hoạt động trong 30 ngày qua, trong nhóm khách hoạt động ít nhất 1 ngày.">
              {data.mau === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Chưa có khách hoạt động trong 30 ngày qua.</p>
              ) : (
                <FrequencyChart frequency={data.frequency} />
              )}
            </ChartCard>
            <ChartCard title="Khách đã rời đi" description="Đã từng hoạt động nhưng không quay lại trong 30 ngày qua.">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                  <UserMinus className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-3xl font-bold tabular-nums">{formatChartNumber(data.inactive30d)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatRate(data.totalConsumers > 0 ? data.inactive30d / data.totalConsumers : null)} trên tổng{" "}
                    {formatChartNumber(data.totalConsumers)} khách đã đăng ký
                  </p>
                </div>
              </div>
            </ChartCard>
          </section>

          <section>
            <ChartCard title="Khách hoạt động nhiều nhất" description="Top 20 theo số ngày hoạt động trong 30 ngày qua; số lượt tư vấn, thử đồ và bấm mua cũng tính trong 30 ngày.">
              <TopUsers users={data.topUsers} />
            </ChartCard>
          </section>
        </div>
      )}
    </PortalAdminPage>
  );
}
