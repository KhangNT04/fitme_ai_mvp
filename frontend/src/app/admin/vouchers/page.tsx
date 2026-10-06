"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { EmptyState } from "@/components/common/EmptyState";
import { PortalActionGroup, PortalActionLink } from "@/components/portal/PortalActionButton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import {
  VoucherCampaignForm,
  campaignFormValuesToWrite,
  emptyVoucherCampaignForm,
} from "@/components/admin/VoucherCampaignForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
  portalTableActionsClass,
} from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";
import { formatDiscountWindow } from "@/lib/plan-pricing";
import { VOUCHER_CAMPAIGNS_QUERY_KEY, adminVoucherApi } from "@/services/voucher-api";
import type { VoucherCampaign } from "@/types/billing";

function CampaignStateBadge({ campaign }: { campaign: VoucherCampaign }) {
  if (campaign.ended) return <Badge variant="outline">Đã kết thúc</Badge>;
  return campaign.active ? <Badge variant="success">Đang hoạt động</Badge> : <Badge variant="outline">Tắt</Badge>;
}

function usageLabel(campaign: VoucherCampaign): string {
  const used = campaign.voucherCountsByStatus?.USED ?? 0;
  return `${used}/${campaign.voucherCount} đã dùng`;
}

function windowLabel(campaign: VoucherCampaign): string {
  return formatDiscountWindow(campaign.validFrom, campaign.validUntil) || "Không giới hạn";
}

export default function AdminVouchersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyVoucherCampaignForm());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: VOUCHER_CAMPAIGNS_QUERY_KEY,
    queryFn: () => adminVoucherApi.getCampaigns(),
  });

  const create = useMutation({
    mutationFn: () => adminVoucherApi.createCampaign(campaignFormValuesToWrite(form)),
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({ queryKey: VOUCHER_CAMPAIGNS_QUERY_KEY });
      actionFeedback({ successMessage: "Đã tạo chiến dịch voucher" }).onSuccess();
      setCreating(false);
      setForm(emptyVoucherCampaignForm());
      router.push(`/admin/vouchers/${campaign.id}`);
    },
    onError: actionFeedback({ errorMessage: "Không thể tạo chiến dịch" }).onError,
  });

  return (
    <PortalAdminPage
      title="Voucher brand"
      description="Tạo chiến dịch voucher giảm giá gói Brand Plus và phát cho các brand được chọn. Mỗi voucher dùng cho một lần mua."
      headerActions={
        !creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            Tạo chiến dịch
          </Button>
        )
      }
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
    >
      <div className="space-y-6">
        {creating && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Chiến dịch mới</h2>
            <VoucherCampaignForm
              form={form}
              setForm={setForm}
              loading={create.isPending}
              submitLabel="Tạo chiến dịch"
              onSubmit={() => create.mutate()}
              onCancel={() => setCreating(false)}
            />
          </section>
        )}

        {data && data.length === 0 && (
          <EmptyState title="Chưa có chiến dịch voucher" description="Tạo chiến dịch để phát voucher cho brand." />
        )}

        {data && data.length > 0 && (
          <>
            <div className={portalCardListClass}>
              {data.map((campaign) => (
                <article key={campaign.id} className={portalCardClass}>
                  <div className={portalCardRowClass}>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{campaign.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        -{campaign.discountPercent}% · {campaign.vouchersPerBrand} voucher/brand ·{" "}
                        {campaign.issuedBrandCount}/{campaign.maxBrands} brand
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {usageLabel(campaign)} · {windowLabel(campaign)}
                      </p>
                    </div>
                    <CampaignStateBadge campaign={campaign} />
                  </div>
                  <PortalActionGroup className={portalCardActionsClass}>
                    <PortalActionLink href={`/admin/vouchers/${campaign.id}`} variant="view">
                      Chi tiết
                    </PortalActionLink>
                  </PortalActionGroup>
                </article>
              ))}
            </div>

            <PortalDataTable>
              <PortalDataTableHead>
                <tr>
                  <th className={portalTableThClass}>Chiến dịch</th>
                  <th className={portalTableThClass}>Giảm</th>
                  <th className={portalTableThClass}>Voucher / brand</th>
                  <th className={portalTableThClass}>Brand đã phát</th>
                  <th className={portalTableThClass}>Đã dùng / đã phát</th>
                  <th className={portalTableThClass}>Thời gian</th>
                  <th className={portalTableThClass}>Trạng thái</th>
                  <th className={portalTableThClass}>Thao tác</th>
                </tr>
              </PortalDataTableHead>
              <PortalDataTableBody>
                {data.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className={portalTableTdClass}>
                      <p className="font-medium">{campaign.name}</p>
                      {campaign.description && (
                        <p className="text-xs text-muted-foreground">{campaign.description}</p>
                      )}
                    </td>
                    <td className={portalTableTdClass}>-{campaign.discountPercent}%</td>
                    <td className={portalTableTdClass}>{campaign.vouchersPerBrand}</td>
                    <td className={portalTableTdClass}>
                      {campaign.issuedBrandCount}/{campaign.maxBrands}
                    </td>
                    <td className={portalTableTdClass}>
                      {campaign.voucherCountsByStatus?.USED ?? 0}/{campaign.voucherCount}
                    </td>
                    <td className={portalTableTdClass}>
                      <span className="text-xs">{windowLabel(campaign)}</span>
                    </td>
                    <td className={portalTableTdClass}>
                      <CampaignStateBadge campaign={campaign} />
                    </td>
                    <td className={portalTableTdClass}>
                      <PortalActionGroup className={portalTableActionsClass}>
                        <PortalActionLink href={`/admin/vouchers/${campaign.id}`} variant="view">
                          Chi tiết
                        </PortalActionLink>
                      </PortalActionGroup>
                    </td>
                  </tr>
                ))}
              </PortalDataTableBody>
            </PortalDataTable>
          </>
        )}
      </div>
    </PortalAdminPage>
  );
}
