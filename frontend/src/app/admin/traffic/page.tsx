"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, CalendarRange, Eye, Gauge, MousePointerClick, Sun } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS, CHART_BAR, CHART_COLORS, CHART_GRID, CHART_LINE, formatChartNumber } from "@/lib/chart-theme";
import {
  LEVEL_LABELS,
  SCALE_LABELS,
  TREND_LABELS,
  VOLATILITY_LABELS,
  buildTrafficInsights,
  formatChange,
  monthLabel,
  movingAverage,
  shortDate,
  weekdayName,
} from "@/lib/traffic-insights";
import { cn } from "@/lib/utils";
import type { TrafficPeriod, TrafficStats } from "@/types/analytics";

const RANGES = [30, 90] as const;
const VIEWS = [
  { key: "daily", label: "Theo ngày" },
  { key: "weekly", label: "Theo tuần" },
  { key: "monthly", label: "Theo tháng" },
] as const;
type ChartView = (typeof VIEWS)[number]["key"];

const TONE_CLASSES = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  neutral: "bg-sky-50 text-sky-700 ring-sky-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  bad: "bg-rose-50 text-rose-700 ring-rose-200",
  muted: "bg-muted text-muted-foreground ring-border",
} as const;

const AXIS_TICK = { fontSize: 11, fill: CHART_AXIS };
const LEGEND_STYLE = { paddingTop: 12, fontSize: 12, color: CHART_AXIS };
const formatTooltip = (value: unknown) => formatChartNumber(Number(value ?? 0));

function periodSub(period: TrafficPeriod, compareLabel: string): string {
  return `${formatChange(period.changePct)} so với ${compareLabel} (${formatChartNumber(period.previousVisitors)})`;
}

function ChartCard({ title, description, actions, children }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/60 bg-white shadow-sm">
      <CardHeader className="space-y-1 border-b border-border/40 bg-muted/10 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description && <CardDescription className="mt-1 text-xs">{description}</CardDescription>}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-4">{children}</CardContent>
    </Card>
  );
}

function Pill({ label, value, tone, hint }: { label: string; value: string; tone: keyof typeof TONE_CLASSES; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-white px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <span className={cn("mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1", TONE_CLASSES[tone])}>
        {value}
      </span>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AssessmentCard({ stats }: { stats: TrafficStats }) {
  const a = stats.assessment;
  const trend = TREND_LABELS[a.trend];
  const level = LEVEL_LABELS[a.level];
  const scale = SCALE_LABELS[a.scale];
  const volatility = VOLATILITY_LABELS[a.volatility];
  const insights = buildTrafficInsights(stats);
  return (
    <ChartCard
      title="Đánh giá mức độ truy cập"
      description="Tự động phân tích 30 ngày đã qua (không tính hôm nay vì chưa hết ngày)."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Pill label="Xu hướng 7 ngày" value={`${trend.label} ${a.trendChangePct != null ? formatChange(a.trendChangePct) : ""}`.trim()} tone={trend.tone} />
        <Pill label="Mức hiện tại" value={level.label} tone={level.tone} hint="So 7 ngày gần nhất với trung bình 30 ngày" />
        <Pill label="Quy mô truy cập" value={scale.label} tone={scale.tone} hint={scale.hint} />
        <Pill label="Độ ổn định" value={volatility.label} tone={volatility.tone} hint="Mức chênh lệch giữa các ngày" />
      </div>
      <ul className="mt-4 space-y-2 text-sm text-foreground">
        {insights.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

function DailyChart({ daily }: { daily: TrafficStats["daily"] }) {
  const data = useMemo(() => {
    const avg = movingAverage(daily.map((d) => d.visitors));
    return daily.map((d, i) => ({ ...d, label: shortDate(d.date), avg7: avg[i] }));
  }, [daily]);
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={16} />
          <YAxis yAxisId="left" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip formatter={formatTooltip} />
          <Legend verticalAlign="bottom" iconType="square" wrapperStyle={LEGEND_STYLE} />
          <Bar yAxisId="left" dataKey="visitors" name="Khách truy cập" fill={CHART_BAR} radius={[2, 2, 0, 0]} maxBarSize={24} />
          <Bar yAxisId="left" dataKey="newVisitors" name="Khách mới" fill={CHART_COLORS[2]} radius={[2, 2, 0, 0]} maxBarSize={24} />
          <Line yAxisId="left" type="monotone" dataKey="avg7" name="Trung bình 7 ngày" stroke={CHART_LINE} strokeWidth={2.5} dot={false} />
          <Line yAxisId="right" type="linear" dataKey="pageViews" name="Lượt xem trang (trục phải)" stroke={CHART_COLORS[3] ?? CHART_LINE} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function BucketChart({ rows, labelOf }: { rows: TrafficStats["weekly"]; labelOf: (start: string) => string }) {
  const data = rows.map((row) => ({ ...row, label: labelOf(row.start) }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} interval={0} />
          <YAxis yAxisId="left" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip formatter={formatTooltip} />
          <Legend verticalAlign="bottom" iconType="square" wrapperStyle={LEGEND_STYLE} />
          <Bar yAxisId="left" dataKey="visitors" name="Khách truy cập" fill={CHART_BAR} radius={[2, 2, 0, 0]} maxBarSize={36} />
          <Line yAxisId="right" type="linear" dataKey="pageViews" name="Lượt xem trang (trục phải)" stroke={CHART_LINE} strokeWidth={2.5} dot={{ r: 3, fill: CHART_LINE, strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeekdayChart({ stats }: { stats: TrafficStats }) {
  const busiest = stats.assessment.busiestWeekday;
  const data = stats.weekdays.map((d) => ({ ...d, label: weekdayName(d.isoDay, true) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip formatter={formatTooltip} />
          <Bar dataKey="avgVisitors" name="Khách trung bình" radius={[2, 2, 0, 0]} maxBarSize={40}>
            {data.map((d) => (
              <Cell key={d.isoDay} fill={d.isoDay === busiest ? CHART_LINE : CHART_BAR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminTrafficPage() {
  const [days, setDays] = useState<number>(30);
  const [view, setView] = useState<ChartView>("daily");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-traffic", days],
    queryFn: () => adminApi.getTraffic(days),
    placeholderData: (prev) => prev,
  });

  return (
    <PortalAdminPage
      title="Thống kê truy cập"
      description="Số khách truy cập website theo ngày, tuần, tháng (giờ Việt Nam). Mỗi trình duyệt được tính 1 khách/ngày; không tính bot và tài khoản quản trị."
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
          <StatCardGrid>
            <StatCard label="Hôm nay" value={formatChartNumber(data.day.visitors)} sub={periodSub(data.day, "hôm qua cùng giờ")} icon={<Sun className="h-5 w-5" />} tone="violet" />
            <StatCard label="7 ngày qua" value={formatChartNumber(data.week.visitors)} sub={periodSub(data.week, "7 ngày trước")} icon={<CalendarDays className="h-5 w-5" />} tone="sky" />
            <StatCard label="30 ngày qua" value={formatChartNumber(data.month.visitors)} sub={periodSub(data.month, "30 ngày trước")} icon={<CalendarRange className="h-5 w-5" />} tone="emerald" />
            <StatCard label="Lượt xem trang hôm nay" value={formatChartNumber(data.day.pageViews)} sub={`${formatChartNumber(data.day.newVisitors)} khách mới hôm nay`} icon={<Eye className="h-5 w-5" />} tone="amber" />
          </StatCardGrid>

          <AssessmentCard stats={data} />

          <ChartCard
            title="Biểu đồ truy cập"
            description={
              view === "daily"
                ? `${data.rangeDays} ngày gần nhất. Đường liền là trung bình 7 ngày để thấy rõ xu hướng.`
                : view === "weekly"
                  ? "12 tuần gần nhất (tuần bắt đầu từ thứ 2). Khách được tính 1 lần mỗi tuần."
                  : "12 tháng gần nhất. Khách được tính 1 lần mỗi tháng."
            }
            actions={
              <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-white p-1" role="group" aria-label="Kiểu biểu đồ">
                {VIEWS.map((item) => (
                  <Button
                    key={item.key}
                    size="sm"
                    variant={view === item.key ? "default" : "ghost"}
                    className="h-7 px-2.5 text-xs"
                    aria-pressed={view === item.key}
                    onClick={() => setView(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            }
          >
            {view === "daily" && <DailyChart daily={data.daily} />}
            {view === "weekly" && <BucketChart rows={data.weekly} labelOf={shortDate} />}
            {view === "monthly" && <BucketChart rows={data.monthly} labelOf={monthLabel} />}
          </ChartCard>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Khách trung bình theo thứ" description="4 tuần gần nhất; cột đậm là ngày đông khách nhất.">
              <WeekdayChart stats={data} />
            </ChartCard>
            <ChartCard title="Chỉ số tương tác" description="30 ngày gần nhất.">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Metric icon={<Gauge className="h-4 w-4" />} label="Trung bình mỗi ngày" value={`${formatChartNumber(data.assessment.avgDailyVisitors)} khách`} />
                <Metric icon={<Gauge className="h-4 w-4" />} label="Trung bình 7 ngày gần nhất" value={`${formatChartNumber(data.assessment.recentAvgDailyVisitors)} khách`} />
                <Metric icon={<MousePointerClick className="h-4 w-4" />} label="Trang mỗi lượt truy cập" value={formatChartNumber(data.assessment.pagesPerVisit)} />
                <Metric icon={<MousePointerClick className="h-4 w-4" />} label="Tỉ lệ khách quay lại" value={`${Math.round(data.assessment.returningRate * 100)}%`} />
                <Metric icon={<Eye className="h-4 w-4" />} label="Lượt xem trang 30 ngày" value={formatChartNumber(data.month.pageViews)} />
                <Metric icon={<Sun className="h-4 w-4" />} label="Ngày đông nhất" value={data.assessment.peakDate ? `${shortDate(data.assessment.peakDate)} · ${formatChartNumber(data.assessment.peakVisitors)} khách` : "—"} />
              </dl>
            </ChartCard>
          </section>
        </div>
      )}
    </PortalAdminPage>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
