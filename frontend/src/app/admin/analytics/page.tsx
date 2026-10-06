"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarCheck,
  CreditCard,
  Repeat,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS, CHART_BAR, CHART_COLORS, CHART_GRID, CHART_LINE, formatChartNumber } from "@/lib/chart-theme";
import { formatPercent, formatPrice } from "@/utils/format-price";
import type { AdminMetrics } from "@/types/analytics";

const RANGES = [7, 30, 90] as const;

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

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

function UsersTrendChart({ daily }: { daily: AdminMetrics["daily"] }) {
  const data = daily.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={16} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={36} />
          <Tooltip formatter={(value) => formatChartNumber(Number(value ?? 0))} />
          <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ paddingTop: 12, fontSize: 12, color: CHART_AXIS }} />
          <Bar dataKey="signups" name="Đăng ký mới" fill={CHART_BAR} radius={[2, 2, 0, 0]} maxBarSize={24} />
          <Line type="linear" dataKey="activeUsers" name="Người dùng hoạt động" stroke={CHART_LINE} strokeWidth={2.5} dot={false} />
          <Line type="linear" dataKey="tryOns" name="Lượt thử đồ AI" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function RevenueTrendChart({ daily }: { daily: AdminMetrics["daily"] }) {
  const data = daily.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={16} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            formatter={(value, name) =>
              name === "Doanh thu" ? formatPrice(Number(value ?? 0)) : formatChartNumber(Number(value ?? 0))
            }
          />
          <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ paddingTop: 12, fontSize: 12, color: CHART_AXIS }} />
          <Bar yAxisId="left" dataKey="revenueVnd" name="Doanh thu" fill={CHART_COLORS[3] ?? CHART_BAR} radius={[2, 2, 0, 0]} maxBarSize={24} />
          <Line yAxisId="right" type="linear" dataKey="paidTransactions" name="Giao dịch đã thanh toán" stroke={CHART_LINE} strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: AdminMetrics["funnel"] }) {
  const top = funnel[0]?.users ?? 0;
  const data = funnel.map((step) => ({
    ...step,
    pct: top > 0 ? `${Math.round((step.users / top) * 100)}%` : "0%",
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 48, left: 4, bottom: 4 }} barCategoryGap="18%">
          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
          <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => formatChartNumber(Number(value ?? 0))} />
          <Bar dataKey="users" name="Người dùng" fill={CHART_BAR} radius={[0, 2, 2, 0]} maxBarSize={26}>
            <LabelList dataKey="pct" position="right" className="fill-foreground text-[11px]" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-metrics", days],
    queryFn: () => adminApi.getMetrics(days),
  });

  return (
    <PortalAdminPage
      title="Phân tích tăng trưởng"
      description="Người dùng thật, hoạt động hằng ngày, phễu chuyển đổi và doanh thu — số liệu lấy trực tiếp từ hệ thống."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
      headerActions={
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-white p-1" role="group" aria-label="Khoảng thời gian">
          {RANGES.map((range) => (
            <Button
              key={range}
              size="sm"
              variant={days === range ? "default" : "ghost"}
              className="h-8 px-3"
              aria-pressed={days === range}
              onClick={() => setDays(range)}
            >
              {range} ngày
            </Button>
          ))}
        </div>
      }
    >
      {data && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Người dùng</h2>
            <StatCardGrid>
              <StatCard label="Tổng người dùng" value={formatChartNumber(data.users.totalUsers)} sub={`${formatChartNumber(data.users.verifiedUsers)} đã xác minh email`} icon={<Users className="h-5 w-5" />} tone="violet" />
              <StatCard label={`Đăng ký mới (${data.rangeDays} ngày)`} value={formatChartNumber(data.users.newUsers)} icon={<UserPlus className="h-5 w-5" />} tone="sky" />
              <StatCard label="Hoạt động hôm nay (DAU)" value={formatChartNumber(data.users.dailyActive)} sub={`WAU ${formatChartNumber(data.users.weeklyActive)}`} icon={<Activity className="h-5 w-5" />} tone="emerald" />
              <StatCard label="Hoạt động 30 ngày (MAU)" value={formatChartNumber(data.users.monthlyActive)} sub={`${formatChartNumber(data.users.returningUsers30d)} quay lại ≥ 2 ngày`} icon={<Repeat className="h-5 w-5" />} tone="indigo" />
            </StatCardGrid>
            <ChartCard
              title="Đăng ký & hoạt động theo ngày"
              description={`Từ ${shortDate(data.fromDate)} đến ${shortDate(data.toDate)} (giờ Việt Nam). Người dùng hoạt động = đăng nhập và dùng app trong ngày.`}
            >
              <UsersTrendChart daily={data.daily} />
            </ChartCard>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Doanh thu & khách trả tiền</h2>
                <p className="text-sm text-muted-foreground">Gói FitMe Pro và gói Fitken đã thanh toán.</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/paying-customers">Danh sách khách trả tiền</Link>
              </Button>
            </div>
            <StatCardGrid>
              <StatCard label="Khách trả tiền (tổng)" value={formatChartNumber(data.revenue.payingUsersAllTime)} sub={`${formatChartNumber(data.revenue.payingUsersInRange)} trong ${data.rangeDays} ngày`} icon={<Wallet className="h-5 w-5" />} tone="emerald" />
              <StatCard label="Giao dịch đã thanh toán" value={formatChartNumber(data.revenue.paidTransactionsInRange)} sub={`${data.rangeDays} ngày gần nhất`} icon={<CalendarCheck className="h-5 w-5" />} tone="sky" />
              <StatCard label="Doanh thu gói Pro" value={formatPrice(data.revenue.proRevenueVnd)} sub={`${formatChartNumber(data.revenue.activeProSubscribers)} thuê bao đang hoạt động`} icon={<CreditCard className="h-5 w-5" />} tone="violet" />
            </StatCardGrid>
            <ChartCard title="Doanh thu theo ngày">
              <RevenueTrendChart daily={data.daily} />
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Phễu chuyển đổi"
              description={`Nhóm người đăng ký trong ${data.rangeDays} ngày; % so với số đăng ký.`}
            >
              <FunnelChart funnel={data.funnel} />
            </ChartCard>
            <ChartCard title="Thanh toán gói Pro" description={`Phiên thanh toán PayOS bắt đầu trong ${data.rangeDays} ngày.`}>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Metric label="Mở thanh toán gói Pro" value={formatChartNumber(data.checkout.proCheckoutsStarted)} />
                <Metric label="Đã thanh toán" value={formatChartNumber(data.checkout.proCheckoutsPaid)} />
                <Metric label="Tỉ lệ chuyển đổi" value={formatPercent(data.checkout.proConversionRate)} />
              </dl>
            </ChartCard>
          </section>

          <section>
            <ChartCard title="Nguồn đăng ký (UTM)" description={`Người đăng ký trong ${data.rangeDays} ngày theo utm_source; "(trực tiếp)" = không có UTM.`}>
              {data.signupSources.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Chưa có đăng ký mới trong khoảng này.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Nguồn</th>
                        <th className="py-2 pr-4 text-right font-medium">Đăng ký</th>
                        <th className="py-2 text-right font-medium">Đã trả tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.signupSources.map((row) => (
                        <tr key={row.source} className="border-b border-border/30 last:border-0">
                          <td className="py-2 pr-4 font-medium">{row.source}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatChartNumber(row.users)}</td>
                          <td className="py-2 text-right tabular-nums">{formatChartNumber(row.payingUsers)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </section>
        </div>
      )}
    </PortalAdminPage>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
