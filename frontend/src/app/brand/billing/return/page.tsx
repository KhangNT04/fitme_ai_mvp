"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function BrandBillingReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const status = searchParams.get("status");

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["brand-billing-summary"] });
    const timer = setTimeout(() => router.replace("/brand/billing"), 2000);
    return () => clearTimeout(timer);
  }, [queryClient, router]);

  const message =
    status === "cancel"
      ? "Bạn đã hủy thanh toán. Đang chuyển về trang gói..."
      : "Đang xác nhận thanh toán và cập nhật lượt...";

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader title="Thanh toán" description={message} />
      <LoadingSkeleton count={2} />
    </PortalLayout>
  );
}
