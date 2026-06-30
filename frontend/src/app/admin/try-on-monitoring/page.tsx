"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";

interface TryOnMonitoring {
  tryOnStarted?: number;
  tryOnGenerated?: number;
}

interface FailedPreview {
  id?: string;
  status?: string;
  errorMessage?: string;
}

export default function AdminTryOnMonitoringPage() {
  const { data: monitoring, isLoading } = useQuery({
    queryKey: ["admin-tryon-monitoring"],
    queryFn: () => adminApi.getTryOnMonitoring() as Promise<TryOnMonitoring>,
  });

  const { data: failed, isLoading: loadingFailed } = useQuery({
    queryKey: ["admin-failed-previews"],
    queryFn: () => adminApi.getFailedPreviews() as Promise<FailedPreview[]>,
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Giám sát Try-on" />
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Try-on started" value={monitoring?.tryOnStarted ?? 0} />
            <StatCard label="Try-on generated" value={monitoring?.tryOnGenerated ?? 0} />
          </div>
          <PortalDataTable showOnMobile className="mt-0">
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Preview ID</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Lỗi</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {loadingFailed ? (
                <tr>
                  <td colSpan={3} className={portalTableTdClass}>Đang tải...</td>
                </tr>
              ) : Array.isArray(failed) && failed.length > 0 ? (
                failed.map((p) => (
                  <tr key={p.id}>
                    <td className={`${portalTableTdClass} font-mono text-xs`}>{p.id}</td>
                    <td className={portalTableTdClass}>{p.status}</td>
                    <td className={`${portalTableTdClass} text-red-600`}>{p.errorMessage ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className={`${portalTableTdClass} text-muted-foreground`}>
                    Không có preview lỗi
                  </td>
                </tr>
              )}
            </PortalDataTableBody>
          </PortalDataTable>
        </div>
      )}
    </PortalLayout>
  );
}
