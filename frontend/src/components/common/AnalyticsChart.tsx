"use client";

/** Portal analytics charts — combo bar+line (dual axis), pie, horizontal bar. */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDataPoint } from "@/types/analytics";
import {
  CHART_AXIS,
  CHART_BAR,
  CHART_COLORS,
  CHART_GRID,
  CHART_LINE,
  type ComboChartRow,
  chartTotal,
  formatChartNumber,
  formatChartPercent,
  preferHorizontalLayout,
  sortChartData,
  toComboChartData,
  truncateChartLabel,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

interface AnalyticsChartProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  type?: "combo" | "bar" | "line" | "pie";
  layout?: "auto" | "vertical" | "horizontal";
  barLabel?: string;
  lineLabel?: string;
  className?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
  total?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/80 bg-white px-3 py-2 shadow-md">
      <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {entry.name?.includes("%") || entry.name === "% tổng"
                ? `${entry.value}%`
                : formatChartNumber(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
      {total != null && total > 0 && payload.length === 1 && (
        <p className="mt-1.5 border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">
          {formatChartPercent(Number(payload[0].value ?? 0), total)} tổng
        </p>
      )}
    </div>
  );
}

function ChartLegend() {
  return (
    <Legend
      verticalAlign="bottom"
      align="center"
      iconType="square"
      wrapperStyle={{ paddingTop: 16, fontSize: 12, color: CHART_AXIS }}
    />
  );
}

function ChartEmpty({ title }: { title: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 px-6 text-center">
      <BarChart3 className="h-9 w-9 text-muted-foreground/50" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-foreground">Chưa có dữ liệu</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {title} sẽ hiển thị khi người dùng tương tác với sản phẩm trên nền tảng.
      </p>
    </div>
  );
}

function formatLabelValue(value: unknown): string {
  return formatChartNumber(Number(value ?? 0));
}

function ComboChartBody({
  data,
  barLabel,
  lineLabel,
}: {
  data: ComboChartRow[];
  barLabel: string;
  lineLabel: string;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            interval={0}
            tickFormatter={(value: string) => truncateChartLabel(value, 10)}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(value: number) => formatChartNumber(value)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip content={<ChartTooltip />} />
          <ChartLegend />
          <Bar
            yAxisId="left"
            dataKey="value"
            name={barLabel}
            fill={CHART_BAR}
            barSize={32}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="share"
            name={lineLabel}
            stroke={CHART_LINE}
            strokeWidth={2.5}
            dot={{ r: 4, fill: CHART_LINE, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: CHART_LINE, stroke: "#fff", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineChartBody({ data, lineLabel }: { data: ChartDataPoint[]; lineLabel: string }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            tickFormatter={(value: string) => truncateChartLabel(value, 12)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(value: number) => formatChartNumber(value)}
          />
          <Tooltip content={<ChartTooltip />} />
          <ChartLegend />
          <Line
            type="monotone"
            dataKey="value"
            name={lineLabel}
            stroke={CHART_LINE}
            strokeWidth={2.5}
            dot={{ r: 4, fill: CHART_LINE, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: CHART_LINE, stroke: "#fff", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartBody({ data, total }: { data: ChartDataPoint[]; total: number }) {
  return (
    <div className="space-y-3">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip total={total} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={1}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <text x="50%" y="48%" textAnchor="middle" fill={CHART_AXIS} fontSize={11} fontWeight={500}>
              Tổng
            </text>
            <text x="50%" y="56%" textAnchor="middle" fill="#111827" fontSize={18} fontWeight={700}>
              {formatChartNumber(total)}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-white px-2.5 py-1.5 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">{entry.name}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {formatChartPercent(entry.value, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HorizontalBarChartBody({ data, total }: { data: ChartDataPoint[]; total: number }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 8, right: 32, left: 4, bottom: 4 }} barCategoryGap="20%">
          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            tickFormatter={(value: number) => formatChartNumber(value)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={112}
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => truncateChartLabel(value, 14)}
          />
          <Tooltip content={<ChartTooltip total={total} />} cursor={{ fill: "rgba(91, 155, 213, 0.12)" }} />
          <Bar dataKey="value" name="Số lượng" fill={CHART_BAR} radius={[0, 2, 2, 0]} maxBarSize={24}>
            <LabelList dataKey="value" position="right" className="fill-foreground text-[11px]" formatter={formatLabelValue} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function VerticalBarChartBody({ data, total, barLabel }: { data: ChartDataPoint[]; total: number; barLabel: string }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }} barCategoryGap="24%">
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            interval={0}
            tickFormatter={(value: string) => truncateChartLabel(value, 10)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(value: number) => formatChartNumber(value)}
          />
          <Tooltip content={<ChartTooltip total={total} />} cursor={{ fill: "rgba(91, 155, 213, 0.12)" }} />
          <ChartLegend />
          <Bar dataKey="value" name={barLabel} fill={CHART_BAR} radius={[2, 2, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsChart({
  title,
  description,
  data,
  type = "combo",
  layout = "auto",
  barLabel = "Số lượng",
  lineLabel = "% tổng",
  className,
}: AnalyticsChartProps) {
  const sorted = useMemo(() => sortChartData(data), [data]);
  const comboData = useMemo(() => toComboChartData(sorted), [sorted]);
  const total = useMemo(() => chartTotal(sorted), [sorted]);
  const horizontal = layout === "horizontal" || (layout === "auto" && type !== "pie" && type !== "line" && preferHorizontalLayout(sorted));

  let chartBody: React.ReactNode;
  if (sorted.length === 0) {
    chartBody = <ChartEmpty title={title} />;
  } else if (type === "pie") {
    chartBody = <PieChartBody data={sorted} total={total} />;
  } else if (type === "line") {
    chartBody = <LineChartBody data={sorted} lineLabel={lineLabel} />;
  } else if (horizontal) {
    chartBody = <HorizontalBarChartBody data={sorted} total={total} />;
  } else if (type === "bar") {
    chartBody = <VerticalBarChartBody data={sorted} total={total} barLabel={barLabel} />;
  } else {
    chartBody = <ComboChartBody data={comboData} barLabel={barLabel} lineLabel={lineLabel} />;
  }

  return (
    <Card className={cn("overflow-hidden border-border/60 bg-white shadow-sm", className)}>
      <CardHeader className="space-y-1 border-b border-border/40 bg-muted/10 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description && <CardDescription className="mt-1 text-xs">{description}</CardDescription>}
          </div>
          {total > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tổng</p>
              <p className="font-display text-lg font-bold tabular-nums text-foreground">{formatChartNumber(total)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-4">{chartBody}</CardContent>
    </Card>
  );
}

const statTones = {
  default: "from-violet-500/15 to-transparent border-violet-500/20",
  violet: "from-violet-500/15 to-transparent border-violet-500/20",
  emerald: "from-emerald-500/15 to-transparent border-emerald-500/20",
  amber: "from-amber-500/15 to-transparent border-amber-500/20",
  rose: "from-rose-500/15 to-transparent border-rose-500/20",
  sky: "from-sky-500/15 to-transparent border-sky-500/20",
  indigo: "from-indigo-500/15 to-transparent border-indigo-500/20",
} as const;

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  tone?: keyof typeof statTones;
  className?: string;
}

export function StatCard({ label, value, sub, icon, tone = "default", className }: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 bg-gradient-to-br shadow-sm",
        statTones[tone],
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {value}
            </p>
            {sub && (
              <p className="mt-2 inline-flex rounded-full bg-background/70 px-2.5 py-0.5 text-xs text-muted-foreground ring-1 ring-border/60">
                {sub}
              </p>
            )}
          </div>
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm ring-1 ring-border/60">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4", className)}>{children}</div>
  );
}
