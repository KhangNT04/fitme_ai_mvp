"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReasonDialog } from "@/components/commerce/ReasonDialog";
import { SettlementStatusBadge } from "@/components/commerce/StatusBadge";
import { SummaryCards } from "@/components/commerce/SummaryCards";
import { formatCommerceDate } from "@/lib/commerce-utils";
import { getCommerceErrorMessage } from "@/lib/commerce-errors";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
} from "@/lib/design-tokens";
import { adminApi } from "@/services/admin-api";
import { adminCommerceApi } from "@/services/admin-commerce-api";
import { toast } from "@/stores/toast-store";
import { formatPrice } from "@/utils/format-price";
import type { SellerSettlement } from "@/types/commerce";

const ALL = "ALL";

const STATUS_FILTERS = [
  { value: ALL, label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ chuyển khoản" },
  { value: "PAID", label: "Đã thanh toán" },
];

export default function AdminSettlementsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(ALL);
  const [brandId, setBrandId] = useState(ALL);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<SellerSettlement | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["admin-commerce-summary"],
    queryFn: () => adminCommerceApi.getSummary(),
  });
  const brandsQuery = useQuery({ queryKey: ["admin-brands"], queryFn: () => adminApi.getBrands() });
  const listQuery = useQuery({
    queryKey: ["admin-settlements", status, brandId],
    queryFn: () =>
      adminCommerceApi.listSettlements({
        status: status === ALL ? undefined : status,
        brandId: brandId === ALL ? undefined : brandId,
      }),
  });

  const brandNames = useMemo(
    () => new Map((brandsQuery.data ?? []).map((b) => [b.id, b.name] as const)),
    [brandsQuery.data],
  );
  const brandLabel = (id?: string) => (id ? (brandNames.get(id) ?? `${id.slice(0, 8)}…`) : "—");

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-commerce-summary"] });
  };

  const generate = useMutation({
    mutationFn: () => adminCommerceApi.generateSettlements(brandId === ALL ? undefined : brandId),
    onSuccess: (created) => {
      setGenerateOpen(false);
      refresh();
      if (created.length === 0) toast.info("Không có đơn nào đủ điều kiện đối soát");
      else toast.success(`Đã tạo ${created.length} kỳ đối soát`);
    },
    onError: (e) => toast.error(getCommerceErrorMessage(e, "Không tạo được kỳ đối soát")),
  });

  const markPaid = useMutation({
    mutationFn: ({ id, payoutRef }: { id: string; payoutRef: string }) =>
      adminCommerceApi.markSettlementPaid(id, payoutRef),
    onSuccess: () => {
      setPayTarget(null);
      refresh();
      toast.success("Đã đánh dấu đã thanh toán");
    },
    onError: (e) => {
      toast.error(getCommerceErrorMessage(e, "Không cập nhật được kỳ đối soát"));
      refresh();
    },
  });

  const summary = summaryQuery.data;
  const settlements = listQuery.data ?? [];
  const selectedBrandName = brandId === ALL ? null : brandLabel(brandId);

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Đối soát" description="Doanh thu sàn, hoa hồng và thanh toán cho seller.">
        <Button onClick={() => setGenerateOpen(true)} data-testid="generate-settlements">
          Tạo kỳ đối soát
        </Button>
      </PortalPageHeader>

      {summaryQuery.isLoading && <LoadingSkeleton type="list" count={1} />}
      {summaryQuery.error && <ErrorState onRetry={() => summaryQuery.refetch()} />}
      {summary && (
        <SummaryCards
          items={[
            { label: "GMV (đơn hoàn tất)", value: formatPrice(summary.gmvVnd) },
            {
              label: "Hoa hồng nền tảng",
              value: formatPrice(summary.commissionVnd),
              hint: "Từ các đơn seller đã giao",
              tone: "success",
            },
            { label: "Tổng số đơn", value: String(summary.ordersCount) },
            {
              label: "Chờ thanh toán seller",
              value: formatPrice(summary.pendingSettlementVnd),
              hint: "Các kỳ đối soát đang chờ chuyển khoản",
              tone: "warning",
            },
          ]}
        />
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <Label>Trạng thái</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-1" aria-label="Lọc theo trạng thái">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <Label>Thương hiệu</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="mt-1" aria-label="Lọc theo thương hiệu">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả thương hiệu</SelectItem>
              {(brandsQuery.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {listQuery.isLoading && <LoadingSkeleton type="list" />}
      {listQuery.error && <ErrorState onRetry={() => listQuery.refetch()} />}
      {listQuery.data && settlements.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          Chưa có kỳ đối soát phù hợp.
        </p>
      )}

      {settlements.length > 0 && (
        <>
          <div className={portalCardListClass}>
            {settlements.map((s) => (
              <article key={s.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{s.brandName}</p>
                    <p className="mt-1 text-sm">{formatPrice(s.payoutVnd)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.orderCount} đơn · Doanh thu {formatPrice(s.subtotalVnd)} · Hoa hồng {formatPrice(s.commissionVnd)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tạo {formatCommerceDate(s.createdAt, false)}
                      {s.payoutRef ? ` · Mã GD ${s.payoutRef}` : ""}
                    </p>
                  </div>
                  <SettlementStatusBadge status={s.status} />
                </div>
                {s.status === "PENDING" && (
                  <div className={portalCardActionsClass}>
                    <PortalActionButton variant="approve" onClick={() => setPayTarget(s)}>
                      Đánh dấu đã trả
                    </PortalActionButton>
                  </div>
                )}
              </article>
            ))}
          </div>

          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Thương hiệu</th>
                <th className={portalTableThClass}>Ngày tạo</th>
                <th className={portalTableThClass}>Doanh thu</th>
                <th className={portalTableThClass}>Hoa hồng</th>
                <th className={portalTableThClass}>Thực trả</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Mã giao dịch</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {settlements.map((s) => (
                <tr key={s.id} data-testid="settlement-row">
                  <td className={portalTableTdClass}>{s.brandName}</td>
                  <td className={portalTableTdClass}>{formatCommerceDate(s.createdAt, false)}</td>
                  <td className={portalTableTdClass}>{formatPrice(s.subtotalVnd)}</td>
                  <td className={portalTableTdClass}>{formatPrice(s.commissionVnd)}</td>
                  <td className={`${portalTableTdClass} font-semibold`}>{formatPrice(s.payoutVnd)}</td>
                  <td className={portalTableTdClass}>
                    <SettlementStatusBadge status={s.status} />
                  </td>
                  <td className={portalTableTdClass}>{s.payoutRef || "—"}</td>
                  <td className={portalTableTdClass}>
                    {s.status === "PENDING" ? (
                      <PortalActionButton variant="approve" onClick={() => setPayTarget(s)}>
                        Đánh dấu đã trả
                      </PortalActionButton>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {s.paidAt ? formatCommerceDate(s.paidAt, false) : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}

      <ConfirmDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title="Tạo kỳ đối soát?"
        description={
          selectedBrandName
            ? `Tạo kỳ đối soát cho "${selectedBrandName}" từ các đơn đã giao và quá thời gian đổi trả.`
            : "Tạo kỳ đối soát cho tất cả thương hiệu có đơn đã giao và quá thời gian đổi trả."
        }
        confirmLabel="Tạo kỳ đối soát"
        loading={generate.isPending}
        onConfirm={() => generate.mutate()}
      />

      <ReasonDialog
        open={!!payTarget}
        onOpenChange={(open) => !open && setPayTarget(null)}
        title="Đánh dấu đã thanh toán"
        description={
          payTarget
            ? `Xác nhận đã chuyển ${formatPrice(payTarget.payoutVnd)} cho ${payTarget.brandName}.`
            : ""
        }
        label="Mã giao dịch chuyển khoản"
        placeholder="Ví dụ: FT26100412345"
        required
        confirmLabel="Xác nhận đã trả"
        loading={markPaid.isPending}
        onConfirm={(payoutRef) => payTarget && markPaid.mutate({ id: payTarget.id, payoutRef })}
      />
    </PortalLayout>
  );
}
