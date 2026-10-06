"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, Receipt, Users, Wallet } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatApiDate } from "@/lib/date-format";
import { portalCardClass, portalCardListClass, portalCardRowClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { formatPrice } from "@/utils/format-price";
import type { PayingCustomersReport, PayingTransactionKind } from "@/types/analytics";

const KIND_LABELS: Record<PayingTransactionKind, string> = {
  PREMIUM_SUBSCRIPTION: "Gói FitMe Premium",
};

type Row = PayingCustomersReport["rows"][number];

function MockBadge({ row }: { row: Row }) {
  if (row.mock) return <Badge variant="warning">Giả lập</Badge>;
  return null;
}

export default function AdminPayingCustomersPage() {
  const [downloading, setDownloading] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-paying-customers"],
    queryFn: () => adminApi.getPayingCustomers(),
  });

  async function handleExport() {
    setDownloading(true);
    try {
      const { blob, filename } = await adminApi.downloadPayingCustomersCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Không tải được file CSV"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <PortalAdminPage
      title="Khách hàng trả tiền"
      description="Danh sách giao dịch gói Premium đã thanh toán kèm email khách hàng — dùng làm báo cáo doanh thu."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={data != null && data.rows.length === 0}
      emptyTitle="Chưa có giao dịch đã thanh toán"
      emptyDescription="Khi khách mua gói Premium, giao dịch sẽ xuất hiện tại đây."
      skeleton="list"
      headerActions={
        <Button size="sm" onClick={handleExport} disabled={downloading || !data?.rows.length}>
          <Download className="mr-1.5 h-4 w-4" />
          {downloading ? "Đang xuất…" : "Xuất CSV"}
        </Button>
      }
    >
      {data && (
        <div className="space-y-6">
          {(data.payosMock || data.mockTransactions > 0) && (
            <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                {data.payosMock
                  ? "PayOS đang chạy chế độ giả lập: giao dịch mới không phải tiền thật. "
                  : ""}
                {data.mockTransactions > 0
                  ? `${data.mockTransactions} giao dịch gói Premium được đánh dấu "Giả lập" và không tính vào doanh thu thật.`
                  : ""}
              </p>
            </div>
          )}

          <StatCardGrid>
            <StatCard label="Khách đã trả tiền" value={data.payingCustomers} icon={<Users className="h-5 w-5" />} tone="emerald" />
            <StatCard label="Giao dịch" value={data.transactions} icon={<Receipt className="h-5 w-5" />} tone="sky" />
            <StatCard label="Doanh thu thật" value={formatPrice(data.liveRevenueVnd)} sub="Không gồm giao dịch giả lập" icon={<Wallet className="h-5 w-5" />} tone="violet" />
            <StatCard label="Tổng ghi nhận" value={formatPrice(data.totalRevenueVnd)} icon={<Wallet className="h-5 w-5" />} tone="amber" />
          </StatCardGrid>

          <div className={portalCardListClass}>
            {data.rows.map((row) => (
              <article key={`${row.kind}-${row.transactionId}`} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.customerName || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.email || "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {KIND_LABELS[row.kind]} · {formatApiDate(row.paidAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatPrice(row.amountVnd)}</span>
                    <MockBadge row={row} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Thời gian</th>
                <th className={portalTableThClass}>Khách hàng</th>
                <th className={portalTableThClass}>Email</th>
                <th className={portalTableThClass}>Loại</th>
                <th className={portalTableThClass}>Mã tham chiếu</th>
                <th className={portalTableThClass}>Số tiền</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.rows.map((row) => (
                <tr key={`${row.kind}-${row.transactionId}`}>
                  <td className={portalTableTdClass}>{formatApiDate(row.paidAt)}</td>
                  <td className={portalTableTdClass}>{row.customerName || "—"}</td>
                  <td className={portalTableTdClass}>{row.email || "—"}</td>
                  <td className={portalTableTdClass}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{KIND_LABELS[row.kind]}</span>
                      <MockBadge row={row} />
                    </div>
                  </td>
                  <td className={portalTableTdClass}>
                    <span className="font-mono text-xs">{row.reference || "—"}</span>
                  </td>
                  <td className={`${portalTableTdClass} font-medium tabular-nums`}>{formatPrice(row.amountVnd)}</td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </div>
      )}
    </PortalAdminPage>
  );
}
