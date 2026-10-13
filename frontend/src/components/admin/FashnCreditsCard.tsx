"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Coins, ExternalLink, RefreshCw } from "lucide-react";
import { adminApi, type FashnCreditStatus } from "@/services/admin-api";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatApiDate } from "@/lib/date-format";
import { portalSectionTitleClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const FALLBACK_TOP_UP_URL = "https://app.fashn.ai/billing/api";
const number = new Intl.NumberFormat("vi-VN");

function unavailableMessage(status: FashnCreditStatus): string {
  switch (status.errorCode) {
    case "NOT_CONFIGURED":
      return `ai-vton chưa có FASHN_API_KEY nên thử mặc AI không dùng FASHN (chế độ hiện tại: ${status.aiMode ?? "?"}).`;
    case "UNAUTHORIZED":
      return "FASHN từ chối API key. Kiểm tra lại FASHN_API_KEY trên ai-vton.";
    case "UNREACHABLE":
      return "Không kết nối được service ai-vton để đọc số dư.";
    case "UNSUPPORTED":
      return "ai-vton đang chạy bản cũ chưa hỗ trợ đọc số dư. Hãy deploy lại ai-vton.";
    default:
      return status.errorMessage || "Không đọc được số dư FASHN.";
  }
}

function useFashnCredits() {
  return useQuery({
    queryKey: ["admin-fashn-credits"],
    queryFn: adminApi.getFashnCredits,
    refetchInterval: 5 * 60_000,
  });
}

/** Renders nothing unless the balance is readable and below the alert threshold. */
export function FashnLowCreditBanner({ className }: { className?: string }) {
  const { data } = useFashnCredits();
  if (!data?.available || !data.low) {
    return null;
  }
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Credit FASHN còn {number.format(data.total ?? 0)}
          {data.estimatedDaysLeft != null ? ` (đủ khoảng ${number.format(data.estimatedDaysLeft)} ngày)` : ""}. Nạp
          thêm để thử mặc AI không bị gián đoạn.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/try-on-monitoring">Chi tiết</Link>
        </Button>
        <Button asChild size="sm">
          <a href={data.topUpUrl || FALLBACK_TOP_UP_URL} target="_blank" rel="noopener noreferrer">
            Mua thêm credit
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export function FashnCreditsCard({ className }: { className?: string }) {
  const { data, isLoading, isFetching, error, refetch } = useFashnCredits();

  const topUpUrl = data?.topUpUrl || FALLBACK_TOP_UP_URL;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={portalSectionTitleClass}>Credit FASHN API</h2>
          {data?.available && (
            <Badge variant={data.low ? "warning" : "success"}>{data.low ? "Sắp hết" : "Đủ dùng"}</Badge>
          )}
          {data && !data.available && <Badge variant="outline">Không đọc được</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
            Làm mới
          </Button>
          <Button asChild size="sm">
            <a href={topUpUrl} target="_blank" rel="noopener noreferrer">
              Mua thêm credit
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang đọc số dư FASHN...</p>}
      {error && !data && <p className="text-sm text-red-600">Không tải được số dư FASHN. Thử lại sau.</p>}

      {data && !data.available && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {unavailableMessage(data)}
        </p>
      )}

      {data?.available && (
        <>
          {data.low && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Số dư dưới ngưỡng cảnh báo {number.format(data.lowThreshold)} credit. Khi về 0, thử mặc AI sẽ báo lỗi
                cho người dùng. Quản trị viên nhận email nhắc mỗi ngày cho tới khi nạp thêm.
              </p>
            </div>
          )}
          <StatCardGrid>
            <StatCard
              label="Credit còn lại"
              value={number.format(data.total ?? 0)}
              sub={`Gói tháng ${number.format(data.subscription ?? 0)} · Mua lẻ ${number.format(data.onDemand ?? 0)}`}
              icon={<Coins className="h-5 w-5" />}
              tone={data.low ? "amber" : "emerald"}
            />
            <StatCard
              label="Đã dùng 7 ngày"
              value={number.format(data.consumed7d)}
              sub={`30 ngày: ${number.format(data.consumed30d)}`}
              tone="violet"
            />
            <StatCard
              label="Ước tính còn đủ"
              value={data.estimatedDaysLeft != null ? `${number.format(data.estimatedDaysLeft)} ngày` : "—"}
              sub={
                data.averageDailyUsage != null
                  ? `≈ ${number.format(data.averageDailyUsage)} credit/ngày`
                  : "Cần ít nhất 1 ngày dữ liệu"
              }
              tone={data.estimatedDaysLeft != null && data.estimatedDaysLeft < 7 ? "rose" : "sky"}
            />
            <StatCard
              label="Thử mặc AI thành công 7 ngày"
              value={number.format(data.aiTryOns7d)}
              sub={`30 ngày: ${number.format(data.aiTryOns30d)}`}
              tone="indigo"
            />
          </StatCardGrid>
          <p className="text-xs text-muted-foreground">
            Mỗi món đồ được mặc thử tốn 1 credit (bộ áo + quần = 2 credit); lượt lỗi không bị trừ. Mức dùng tính từ số dư
            được đọc mỗi giờ
            {data.trackedSince ? `, bắt đầu theo dõi ${formatApiDate(data.trackedSince, true)}` : ""}; lần nạp thêm
            không bị tính là đã dùng. Cập nhật {formatApiDate(data.checkedAt, true)}.
          </p>
        </>
      )}
    </section>
  );
}
