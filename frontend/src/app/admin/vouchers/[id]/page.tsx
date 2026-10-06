"use client";

import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PortalActionButton, PortalActionGroup } from "@/components/portal/PortalActionButton";
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
  campaignToFormValues,
  emptyVoucherCampaignForm,
} from "@/components/admin/VoucherCampaignForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { portalCardClass, portalTableActionsClass } from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";
import { formatDateDMY } from "@/lib/date-format";
import { formatDiscountWindow } from "@/lib/plan-pricing";
import {
  campaignIssueBlocker,
  campaignSlotsLeft,
  voucherExpiryLabel,
  voucherStatusLabel,
  voucherStatusVariant,
} from "@/lib/brand-voucher";
import { adminApi } from "@/services/admin-api";
import { VOUCHER_CAMPAIGNS_QUERY_KEY, adminVoucherApi } from "@/services/voucher-api";
import { toast } from "@/stores/toast-store";
import type { AdminBrandVoucher, BrandVoucherStatus, VoucherCampaign } from "@/types/billing";

const STATUS_ORDER: BrandVoucherStatus[] = ["ISSUED", "RESERVED", "USED", "REVOKED", "EXPIRED"];

export default function AdminVoucherCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyVoucherCampaignForm());

  const campaignQuery = useQuery({
    queryKey: ["admin-voucher-campaign", id],
    queryFn: () => adminVoucherApi.getCampaign(id),
  });
  const vouchersQuery = useQuery({
    queryKey: ["admin-voucher-campaign-vouchers", id],
    queryFn: () => adminVoucherApi.getVouchers(id),
  });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: VOUCHER_CAMPAIGNS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["admin-voucher-campaign", id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-voucher-campaign-vouchers", id] });
  };

  const save = useMutation({
    mutationFn: () => adminVoucherApi.updateCampaign(id, campaignFormValuesToWrite(form)),
    onSuccess: () => {
      refreshAll();
      actionFeedback({ successMessage: "Đã cập nhật chiến dịch" }).onSuccess();
      setEditing(false);
    },
    onError: actionFeedback({ errorMessage: "Không thể cập nhật chiến dịch" }).onError,
  });

  const campaign = campaignQuery.data;

  return (
    <PortalAdminPage
      title={campaign ? `Chiến dịch: ${campaign.name}` : "Chiến dịch voucher"}
      description="Phát voucher cho brand đã duyệt và theo dõi trạng thái từng mã."
      backHref="/admin/vouchers"
      backLabel="Voucher brand"
      headerActions={
        campaign &&
        !editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setForm(campaignToFormValues(campaign));
              setEditing(true);
            }}
          >
            Sửa chiến dịch
          </Button>
        )
      }
      isLoading={campaignQuery.isLoading}
      error={campaignQuery.error}
      onRetry={() => campaignQuery.refetch()}
      skeleton="detail"
    >
      {campaign && (
        <div className="space-y-8">
          {editing ? (
            <VoucherCampaignForm
              form={form}
              setForm={setForm}
              editing
              loading={save.isPending}
              submitLabel="Lưu thay đổi"
              onSubmit={() => save.mutate()}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <CampaignSummary campaign={campaign} />
          )}

          <IssuePanel campaign={campaign} vouchers={vouchersQuery.data ?? []} onIssued={refreshAll} />

          <VoucherTable
            vouchers={vouchersQuery.data}
            loading={vouchersQuery.isLoading}
            onRevoked={refreshAll}
          />
        </div>
      )}
    </PortalAdminPage>
  );
}

function CampaignSummary({ campaign }: { campaign: VoucherCampaign }) {
  const windowText = formatDiscountWindow(campaign.validFrom, campaign.validUntil);
  return (
    <section className={`${portalCardClass} space-y-3 p-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold text-foreground">-{campaign.discountPercent}%</span>
        {campaign.ended ? (
          <Badge variant="outline">Đã kết thúc</Badge>
        ) : campaign.active ? (
          <Badge variant="success">Đang hoạt động</Badge>
        ) : (
          <Badge variant="outline">Tắt</Badge>
        )}
      </div>
      {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Voucher mỗi brand</dt>
          <dd className="font-medium">{campaign.vouchersPerBrand}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Brand đã phát</dt>
          <dd className="font-medium">
            {campaign.issuedBrandCount}/{campaign.maxBrands}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Thời gian</dt>
          <dd className="font-medium">{windowText || "Không giới hạn"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((status) => (
          <Badge key={status} variant={voucherStatusVariant(status)}>
            {voucherStatusLabel(status)}: {campaign.voucherCountsByStatus?.[status] ?? 0}
          </Badge>
        ))}
      </div>
    </section>
  );
}

function IssuePanel({
  campaign,
  vouchers,
  onIssued,
}: {
  campaign: VoucherCampaign;
  vouchers: AdminBrandVoucher[];
  onIssued: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const brandsQuery = useQuery({ queryKey: ["admin-brands"], queryFn: () => adminApi.getBrands() });

  const issuedBrandIds = useMemo(() => new Set(vouchers.map((v) => v.brandId)), [vouchers]);
  const approvedBrands = useMemo(
    () =>
      (brandsQuery.data ?? [])
        .filter((brand) => brand.status === "APPROVED")
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [brandsQuery.data],
  );
  const term = search.trim().toLowerCase();
  const visibleBrands = term
    ? approvedBrands.filter((brand) => brand.name.toLowerCase().includes(term))
    : approvedBrands;

  const blocker = campaignIssueBlocker(campaign);
  const slotsLeft = campaignSlotsLeft(campaign);
  const tooMany = selected.size > slotsLeft;

  const issue = useMutation({
    mutationFn: () => adminVoucherApi.issue(campaign.id, [...selected]),
    onSuccess: (result) => {
      const skipped = result.skipped.map((b) => b.brandName).join(", ");
      toast.success(
        `Đã phát ${result.vouchersIssued} voucher cho ${result.issued.length} brand` +
          (skipped ? `. Bỏ qua (đã nhận trước đó): ${skipped}` : ""),
      );
      setSelected(new Set());
      onIssued();
    },
    onError: actionFeedback({ errorMessage: "Không thể phát voucher" }).onError,
  });

  const toggle = (brandId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(brandId);
    else next.delete(brandId);
    setSelected(next);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Phát voucher</h2>
      <div className={`${portalCardClass} space-y-3 p-4`}>
        <p className="text-sm text-muted-foreground">
          Mỗi brand được chọn nhận {campaign.vouchersPerBrand} voucher giảm {campaign.discountPercent}%. Brand đã nhận
          voucher của chiến dịch này sẽ được bỏ qua. Còn {slotsLeft} suất brand.
        </p>
        {blocker && <p className="text-sm font-medium text-amber-700">{blocker}</p>}
        <Input
          placeholder="Tìm brand theo tên"
          aria-label="Tìm brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {brandsQuery.isLoading && <LoadingSkeleton type="list" />}
        {brandsQuery.data && approvedBrands.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có brand nào đã được duyệt.</p>
        )}
        {visibleBrands.length > 0 && (
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2" aria-label="Danh sách brand">
            {visibleBrands.map((brand) => {
              const alreadyIssued = issuedBrandIds.has(brand.id);
              return (
                <li key={brand.id}>
                  <label
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      alreadyIssued ? "text-muted-foreground" : "cursor-pointer hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      checked={alreadyIssued || selected.has(brand.id)}
                      disabled={alreadyIssued || !!blocker}
                      onCheckedChange={(checked) => toggle(brand.id, checked === true)}
                    />
                    <span className="min-w-0 flex-1 truncate">{brand.name}</span>
                    {alreadyIssued && <Badge variant="secondary">Đã phát</Badge>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!!blocker || selected.size === 0 || tooMany || issue.isPending}
            onClick={() => issue.mutate()}
          >
            {issue.isPending ? "Đang phát..." : "Phát voucher"}
          </Button>
          <span className="text-sm text-muted-foreground">Đã chọn {selected.size} brand</span>
          {tooMany && (
            <span className="text-sm font-medium text-destructive">Vượt quá {slotsLeft} suất brand còn lại.</span>
          )}
        </div>
      </div>
    </section>
  );
}

function orderLabel(voucher: AdminBrandVoucher): string {
  if (voucher.usedOrderCode) return `#${voucher.usedOrderCode}`;
  if (voucher.reservedOrderCode) return `#${voucher.reservedOrderCode} (chờ thanh toán)`;
  return "—";
}

function VoucherTable({
  vouchers,
  loading,
  onRevoked,
}: {
  vouchers?: AdminBrandVoucher[];
  loading: boolean;
  onRevoked: () => void;
}) {
  const [target, setTarget] = useState<AdminBrandVoucher | null>(null);

  const revoke = useMutation({
    mutationFn: (voucherId: string) => adminVoucherApi.revoke(voucherId),
    onSuccess: () => {
      actionFeedback({ successMessage: "Đã thu hồi voucher" }).onSuccess();
      setTarget(null);
      onRevoked();
    },
    onError: (err) => {
      actionFeedback({ errorMessage: "Không thể thu hồi voucher" }).onError(err);
      setTarget(null);
      onRevoked();
    },
  });

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Voucher đã phát</h2>
      {loading && <LoadingSkeleton type="list" />}
      {vouchers && vouchers.length === 0 && (
        <EmptyState title="Chưa phát voucher nào" description="Chọn brand ở trên và bấm “Phát voucher”." />
      )}
      {vouchers && vouchers.length > 0 && (
        <PortalDataTable showOnMobile>
          <PortalDataTableHead>
            <tr>
              <th className={portalTableThClass}>Brand</th>
              <th className={portalTableThClass}>Mã</th>
              <th className={portalTableThClass}>Giảm</th>
              <th className={portalTableThClass}>Trạng thái</th>
              <th className={portalTableThClass}>Hạn dùng</th>
              <th className={portalTableThClass}>Đơn</th>
              <th className={portalTableThClass}>Thao tác</th>
            </tr>
          </PortalDataTableHead>
          <PortalDataTableBody>
            {vouchers.map((voucher) => (
              <tr key={voucher.id}>
                <td className={portalTableTdClass}>{voucher.brandName ?? voucher.brandId}</td>
                <td className={`${portalTableTdClass} font-mono text-xs`}>{voucher.code}</td>
                <td className={portalTableTdClass}>-{voucher.discountPercent}%</td>
                <td className={portalTableTdClass}>
                  <Badge variant={voucherStatusVariant(voucher.status)}>{voucherStatusLabel(voucher.status)}</Badge>
                  {voucher.usedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateDMY(voucher.usedAt)}</p>
                  )}
                </td>
                <td className={portalTableTdClass}>{voucherExpiryLabel(voucher.expiresAt)}</td>
                <td className={portalTableTdClass}>{orderLabel(voucher)}</td>
                <td className={portalTableTdClass}>
                  {voucher.status === "ISSUED" && (
                    <PortalActionGroup className={portalTableActionsClass}>
                      <PortalActionButton variant="delete" onClick={() => setTarget(voucher)}>
                        Thu hồi
                      </PortalActionButton>
                    </PortalActionGroup>
                  )}
                </td>
              </tr>
            ))}
          </PortalDataTableBody>
        </PortalDataTable>
      )}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Thu hồi voucher?"
        description={
          target
            ? `Voucher ${target.code} của ${target.brandName ?? "brand"} sẽ không dùng được nữa. Không thể hoàn tác.`
            : ""
        }
        confirmLabel="Thu hồi"
        variant="destructive"
        loading={revoke.isPending}
        onConfirm={() => target && revoke.mutate(target.id)}
      />
    </section>
  );
}
