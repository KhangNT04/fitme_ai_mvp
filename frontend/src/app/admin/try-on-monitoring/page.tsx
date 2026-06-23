"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTryOnMonitoringPage() {
  const { data: monitoring, isLoading } = useQuery({
    queryKey: ["admin-tryon-monitoring"],
    queryFn: () => adminApi.getTryOnMonitoring(),
  });

  const { data: failed } = useQuery({
    queryKey: ["admin-failed-previews"],
    queryFn: () => adminApi.getFailedPreviews(),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="text-2xl font-bold">Giám sát Try-on</h1>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Trạng thái hệ thống</CardTitle></CardHeader>
            <CardContent className="text-sm text-stone-600">
              {monitoring ? JSON.stringify(monitoring, null, 2) : "Không có dữ liệu giám sát"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Preview thất bại</CardTitle></CardHeader>
            <CardContent className="text-sm text-stone-600">
              {Array.isArray(failed) && failed.length > 0
                ? `${failed.length} preview trong hàng đợi lỗi`
                : "Không có preview lỗi"}
            </CardContent>
          </Card>
        </div>
      )}
    </PortalLayout>
  );
}
