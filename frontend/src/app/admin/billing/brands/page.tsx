"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminBillingApi } from "@/services/billing-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalActionLink } from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import {
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
} from "@/lib/design-tokens";

export default function AdminBrandBillingListPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-brand-billing-list"],
    queryFn: () => adminBillingApi.listBrandBilling(),
  });

  return (
    <PortalAdminPage
      title="Gói brand đang dùng"
      description="Theo dõi gói, lượt còn lại và quản lý quyền thử AI của từng thương hiệu."
      headerActions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/billing/plans">Danh mục gói</Link>
        </Button>
      }
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={!data?.length}
      emptyTitle="Chưa có brand"
      emptyDescription="Khi brand đăng ký và mua gói, thông tin sẽ hiển thị tại đây."
    >
      {data && (
        <>
          <div className={portalCardListClass}>
            {data.map((brand) => (
              <article key={brand.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{brand.name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {brand.contactEmail ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {brand.totalQuotaRemaining.toLocaleString("vi-VN")} lượt ·{" "}
                      {brand.activePlanName ?? "Chưa có gói"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{brand.status}</Badge>
                    {brand.dashboardEnabled && (
                      <Badge variant="outline" className="text-emerald-700">
                        Dashboard
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <PortalActionLink href={`/admin/billing/brands/${brand.id}`} variant="edit">
                    Chi tiết gói
                  </PortalActionLink>
                </div>
              </article>
            ))}
          </div>

          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Thương hiệu</th>
                <th className={portalTableThClass}>Email</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Gói hiện tại</th>
                <th className={portalTableThClass}>Lượt còn</th>
                <th className={portalTableThClass}>Dashboard</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((brand) => (
                <tr key={brand.id}>
                  <td className={portalTableTdClass}>{brand.name}</td>
                  <td className={portalTableTdClass}>{brand.contactEmail ?? "—"}</td>
                  <td className={portalTableTdClass}>
                    <Badge variant="outline">{brand.status}</Badge>
                  </td>
                  <td className={portalTableTdClass}>{brand.activePlanName ?? "—"}</td>
                  <td className={portalTableTdClass}>
                    {brand.totalQuotaRemaining.toLocaleString("vi-VN")}
                  </td>
                  <td className={portalTableTdClass}>
                    {brand.dashboardEnabled ? "Có" : "Không"}
                  </td>
                  <td className={portalTableTdClass}>
                    <PortalActionLink href={`/admin/billing/brands/${brand.id}`} variant="edit">
                      Chi tiết
                    </PortalActionLink>
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}
    </PortalAdminPage>
  );
}
