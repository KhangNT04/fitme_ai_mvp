"use client";

import { useQuery } from "@tanstack/react-query";
import { Shirt, Sparkles } from "lucide-react";
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
import { portalSectionTitleClass } from "@/lib/design-tokens";

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
  const { data: monitoring, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-tryon-monitoring"],
    queryFn: () => adminApi.getTryOnMonitoring() as Promise<TryOnMonitoring>,
  });

  const { data: failed, isLoading: loadingFailed } = useQuery({
    queryKey: ["admin-failed-previews"],
    queryFn: () => adminApi.getFailedPreviews() as Promise<FailedPreview[]>,
  });

  return (
    <PortalAdminPage
      title="Giám sát thử mặc"
      description="Theo dõi lượt try-on và các preview AI bị lỗi trên hệ thống."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="card"
    >
      {monitoring && (
        <div className="space-y-6">
          <StatCardGrid className="sm:grid-cols-2 lg:grid-cols-2">
            <StatCard
              label="Lượt try-on bắt đầu"
              value={monitoring.tryOnStarted ?? 0}
              icon={<Sparkles className="h-5 w-5" />}
              tone="violet"
            />
            <StatCard
              label="Preview đã tạo"
              value={monitoring.tryOnGenerated ?? 0}
              icon={<Shirt className="h-5 w-5" />}
              tone="indigo"
            />
          </StatCardGrid>

          <section className="space-y-3">
            <h2 className={portalSectionTitleClass}>Preview lỗi gần đây</h2>
            <PortalDataTable showOnMobile>
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
                    <td colSpan={3} className={portalTableTdClass}>
                      Đang tải...
                    </td>
                  </tr>
                ) : Array.isArray(failed) && failed.length > 0 ? (
                  failed.map((p) => (
                    <tr key={p.id}>
                      <td className={`${portalTableTdClass} font-mono text-xs`}>{p.id}</td>
                      <td className={portalTableTdClass}>{p.status}</td>
                      <td className={`${portalTableTdClass} text-red-600`}>
                        {p.errorMessage ?? "—"}
                      </td>
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
          </section>
        </div>
      )}
    </PortalAdminPage>
  );
}
