"use client";

import { use, useState } from "react";
import { CreditCard, Package, Sparkles, Zap } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalFormCard, PortalWarningCard } from "@/components/portal/PortalFormCard";
import {
  PortalActionButton,
  PortalActionGroup,
} from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { formatPrice } from "@/utils/format-price";
import {
  portalCardClass,
  portalCardStackClass,
  portalSectionClass,
  portalSectionTitleClass,
} from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";

const orderStatusLabel: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

const subscriptionStatusLabel: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã vô hiệu hóa",
};

export default function AdminBrandBillingDetailPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = use(params);
  const queryClient = useQueryClient();
  const [subDelta, setSubDelta] = useState(0);
  const [topupDelta, setTopupDelta] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [deactivateNote, setDeactivateNote] = useState("");

  const detailQuery = useQuery({
    queryKey: ["admin-brand-billing", brandId],
    queryFn: () => adminBillingApi.getBrandBilling(brandId),
  });

  const adjust = useMutation({
    mutationFn: () =>
      adminBillingApi.adjustQuota(brandId, {
        subscriptionDelta: subDelta,
        topupDelta: topupDelta,
        note: adjustNote || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-billing", brandId] });
      queryClient.invalidateQueries({ queryKey: ["admin-brand-billing-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      setSubDelta(0);
      setTopupDelta(0);
      setAdjustNote("");
      actionFeedback({ successMessage: "Đã điều chỉnh lượt" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể điều chỉnh lượt" }).onError,
  });

  const deactivate = useMutation({
    mutationFn: () =>
      adminBillingApi.deactivateBrandBilling(brandId, deactivateNote || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brand-billing", brandId] });
      queryClient.invalidateQueries({ queryKey: ["admin-brand-billing-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      setDeactivateNote("");
      actionFeedback({
        successMessage: "Đã vô hiệu hóa gói — brand không còn lượt thử AI",
      }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể vô hiệu hóa gói" }).onError,
  });

  const data = detailQuery.data;

  return (
    <PortalAdminPage
      title={data?.brandName ?? "Chi tiết gói brand"}
      description={
        data
          ? `${data.contactEmail ?? "—"} · Trạng thái brand: ${data.brandStatus}`
          : "Theo dõi gói và lượt thử AI của thương hiệu."
      }
      backHref="/admin/billing/brands"
      backLabel="Gói brand đang dùng"
      isLoading={detailQuery.isLoading}
      error={detailQuery.error}
      onRetry={() => detailQuery.refetch()}
      skeleton="detail"
    >
      {data && (
        <div className={portalSectionClass}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={data.billingActive ? "default" : "outline"}>
              {data.billingActive ? "Gói đang hoạt động" : "Gói đã vô hiệu hóa / hết lượt"}
            </Badge>
            {data.dashboardEnabled && (
              <Badge variant="outline" className="text-emerald-700">
                Dashboard bật
              </Badge>
            )}
          </div>

          <StatCardGrid className="lg:grid-cols-3">
            <StatCard
              label="Lượt còn lại"
              value={data.totalRemaining.toLocaleString("vi-VN")}
              icon={<Sparkles className="h-5 w-5" />}
              tone="violet"
            />
            <StatCard
              label="Từ gói tháng"
              value={data.subscriptionRemaining.toLocaleString("vi-VN")}
              icon={<Package className="h-5 w-5" />}
              tone="sky"
            />
            <StatCard
              label="Từ top-up"
              value={data.topupRemaining.toLocaleString("vi-VN")}
              icon={<Zap className="h-5 w-5" />}
              tone="amber"
            />
          </StatCardGrid>

          {data.subscription ? (
            <div className={portalCardClass}>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">Gói hiện tại: {data.subscription.planName}</p>
                <Badge variant="outline">
                  {subscriptionStatusLabel[data.subscription.status] ?? data.subscription.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Bắt đầu:{" "}
                {new Date(data.subscription.startsAt).toLocaleDateString("vi-VN")} · Hết hạn:{" "}
                {new Date(data.subscription.expiresAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          ) : (
            <div className={portalCardClass}>
              <p className="font-medium text-muted-foreground">Chưa có gói subscription</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Brand chỉ có lượt từ top-up hoặc chưa mua gói.
              </p>
            </div>
          )}

          <PortalFormCard>
            <h2 className={portalSectionTitleClass}>Điều chỉnh lượt</h2>
            <p className="text-sm text-muted-foreground">
              Nhập số dương để cộng, số âm để trừ. Áp dụng riêng cho lượt gói tháng và top-up.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sub-delta">Thay đổi lượt gói tháng</Label>
                <Input
                  id="sub-delta"
                  type="number"
                  value={subDelta}
                  onChange={(e) => setSubDelta(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topup-delta">Thay đổi lượt top-up</Label>
                <Input
                  id="topup-delta"
                  type="number"
                  value={topupDelta}
                  onChange={(e) => setTopupDelta(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="adjust-note">Ghi chú</Label>
                <Input
                  id="adjust-note"
                  placeholder="Lý do điều chỉnh"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => adjust.mutate()}
              disabled={adjust.isPending || (subDelta === 0 && topupDelta === 0)}
            >
              {adjust.isPending ? "Đang lưu..." : "Áp dụng điều chỉnh"}
            </Button>
          </PortalFormCard>

          <PortalWarningCard>
            <h2 className={`${portalSectionTitleClass} text-amber-950`}>Vô hiệu hóa gói brand</h2>
            <p className="text-sm text-amber-900">
              Hủy subscription đang hoạt động và xóa toàn bộ lượt còn lại của shop này. Sản phẩm
              brand sẽ không còn xuất hiện trong gợi ý AI và không có nút thử mặc.
            </p>
            <div className="space-y-2">
              <Label htmlFor="deactivate-note">Ghi chú (tuỳ chọn)</Label>
              <Input
                id="deactivate-note"
                placeholder="Lý do vô hiệu hóa"
                value={deactivateNote}
                onChange={(e) => setDeactivateNote(e.target.value)}
              />
            </div>
            <PortalActionGroup>
              <PortalActionButton
                variant="suspend"
                loading={deactivate.isPending}
                disabled={!data.billingActive || adjust.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Vô hiệu hóa gói của "${data.brandName}"? Toàn bộ ${data.totalRemaining} lượt sẽ bị thu hồi.`,
                    )
                  ) {
                    deactivate.mutate();
                  }
                }}
              >
                Vô hiệu hóa gói
              </PortalActionButton>
            </PortalActionGroup>
          </PortalWarningCard>

          {data.recentOrders.length > 0 && (
            <section className="space-y-3">
              <h2 className={portalSectionTitleClass}>Đơn thanh toán gần đây</h2>
              <div className={portalCardStackClass}>
                {data.recentOrders.map((order) => (
                  <article key={order.id} className={portalCardClass}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{order.planName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatPrice(order.amountVnd)} · {order.planType}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {orderStatusLabel[order.status] ?? order.status}
                      </Badge>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PortalAdminPage>
  );
}
