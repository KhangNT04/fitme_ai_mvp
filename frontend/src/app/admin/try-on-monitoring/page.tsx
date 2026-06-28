"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/AnalyticsChart";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

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
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Giám sát Try-on</h1>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Try-on started" value={monitoring?.tryOnStarted ?? 0} />
            <StatCard label="Try-on generated" value={monitoring?.tryOnGenerated ?? 0} />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Preview ID</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {loadingFailed ? (
                  <tr><td colSpan={3} className="px-4 py-3">Đang tải...</td></tr>
                ) : Array.isArray(failed) && failed.length > 0 ? (
                  failed.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                      <td className="px-4 py-3">{p.status}</td>
                      <td className="px-4 py-3 text-red-600">{p.errorMessage ?? "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="px-4 py-3 text-muted-foreground">Không có preview lỗi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
