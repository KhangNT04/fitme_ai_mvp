"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PayoutAccountForm } from "@/components/commerce/PayoutAccountForm";
import { SettlementStatusBadge } from "@/components/commerce/StatusBadge";
import { SummaryCards } from "@/components/commerce/SummaryCards";
import { formatCommerceDate } from "@/lib/commerce-utils";
import { actionFeedback } from "@/lib/action-feedback";
import { portalCardClass, portalCardListClass, portalCardRowClass } from "@/lib/design-tokens";
import { sellerOrderApi } from "@/services/seller-order-api";
import { formatPrice } from "@/utils/format-price";

export default function BrandSettlementsPage() {
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ["seller-settlement-summary"],
    queryFn: () => sellerOrderApi.getSettlementSummary(),
  });
  const listQuery = useQuery({
    queryKey: ["seller-settlements"],
    queryFn: () => sellerOrderApi.getSettlements(),
  });
  const payoutQuery = useQuery({
    queryKey: ["seller-payout-account"],
    queryFn: () => sellerOrderApi.getPayoutAccount(),
  });

  const savePayout = useMutation({
    mutationFn: sellerOrderApi.updatePayoutAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-payout-account"] });
      actionFeedback({ successMessage: "Đã lưu tài khoản nhận tiền" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không lưu được tài khoản nhận tiền" }).onError,
  });

  const summary = summaryQuery.data;
  const settlements = listQuery.data ?? [];

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Đối soát"
        description="Theo dõi doanh thu chờ đối soát và các kỳ đã thanh toán."
      />

      {summaryQuery.isLoading && <LoadingSkeleton type="list" count={1} />}
      {summaryQuery.error && <ErrorState onRetry={() => summaryQuery.refetch()} />}
      {summary && (
        <SummaryCards
          items={[
            {
              label: "Đang giữ (chờ hết thời gian đổi trả)",
              value: formatPrice(summary.pendingVnd),
              hint: summary.nextEligibleAt
                ? `Đủ điều kiện từ ${formatCommerceDate(summary.nextEligibleAt, false)}`
                : "Chưa có đơn đang giữ",
              tone: "warning",
            },
            {
              label: "Chờ đối soát",
              value: formatPrice(summary.eligibleVnd),
              hint: "Đủ điều kiện, chờ admin tạo kỳ đối soát",
            },
            {
              label: "Đã thanh toán",
              value: formatPrice(summary.paidVnd),
              hint: "Tổng tiền đã chuyển cho shop",
              tone: "success",
            },
          ]}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Các kỳ đối soát</h2>
        {listQuery.isLoading && <LoadingSkeleton type="list" count={2} />}
        {listQuery.error && <ErrorState onRetry={() => listQuery.refetch()} />}
        {listQuery.data && settlements.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            Chưa có kỳ đối soát nào.
          </p>
        )}

        {settlements.length > 0 && (
          <>
            <div className={portalCardListClass}>
              {settlements.map((s) => (
                <article key={s.id} className={portalCardClass}>
                  <div className={portalCardRowClass}>
                    <div>
                      <p className="text-sm font-semibold">{formatPrice(s.payoutVnd)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Doanh thu {formatPrice(s.subtotalVnd)} · Hoa hồng {formatPrice(s.commissionVnd)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tạo {formatCommerceDate(s.createdAt, false)}
                        {s.paidAt ? ` · Trả ${formatCommerceDate(s.paidAt, false)}` : ""}
                      </p>
                      {s.payoutRef && <p className="mt-1 text-xs">Mã GD: {s.payoutRef}</p>}
                    </div>
                    <SettlementStatusBadge status={s.status} />
                  </div>
                </article>
              ))}
            </div>
            <PortalDataTable>
              <PortalDataTableHead>
                <tr>
                  <th className={portalTableThClass}>Ngày tạo</th>
                  <th className={portalTableThClass}>Doanh thu</th>
                  <th className={portalTableThClass}>Hoa hồng</th>
                  <th className={portalTableThClass}>Thực nhận</th>
                  <th className={portalTableThClass}>Trạng thái</th>
                  <th className={portalTableThClass}>Mã giao dịch</th>
                  <th className={portalTableThClass}>Ngày trả</th>
                </tr>
              </PortalDataTableHead>
              <PortalDataTableBody>
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td className={portalTableTdClass}>{formatCommerceDate(s.createdAt, false)}</td>
                    <td className={portalTableTdClass}>{formatPrice(s.subtotalVnd)}</td>
                    <td className={portalTableTdClass}>{formatPrice(s.commissionVnd)}</td>
                    <td className={`${portalTableTdClass} font-semibold`}>{formatPrice(s.payoutVnd)}</td>
                    <td className={portalTableTdClass}>
                      <SettlementStatusBadge status={s.status} />
                    </td>
                    <td className={portalTableTdClass}>{s.payoutRef || "—"}</td>
                    <td className={portalTableTdClass}>{s.paidAt ? formatCommerceDate(s.paidAt, false) : "—"}</td>
                  </tr>
                ))}
              </PortalDataTableBody>
            </PortalDataTable>
          </>
        )}
      </section>

      {payoutQuery.isLoading && <LoadingSkeleton type="list" count={1} />}
      {payoutQuery.error && <ErrorState onRetry={() => payoutQuery.refetch()} />}
      {payoutQuery.data && (
        <PayoutAccountForm
          key={[
            payoutQuery.data.bankName,
            payoutQuery.data.bankAccountNumber,
            payoutQuery.data.bankAccountName,
          ].join("|")}
          initial={payoutQuery.data}
          saving={savePayout.isPending}
          onSubmit={(value) => savePayout.mutate(value)}
        />
      )}
    </PortalLayout>
  );
}
