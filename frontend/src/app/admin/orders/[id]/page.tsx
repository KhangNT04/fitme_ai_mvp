"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { OrderOverview } from "@/components/commerce/OrderOverview";
import { ShipmentTimeline } from "@/components/commerce/ShipmentTimeline";
import { adminCommerceApi } from "@/services/admin-commerce-api";

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => adminCommerceApi.getOrder(id),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader
        title={data ? `Đơn ${data.orderCode}` : "Chi tiết đơn hàng"}
        description="Chỉ xem — theo dõi đơn hàng và vận chuyển."
        backHref="/admin/orders"
        backLabel="Đơn hàng"
      />

      {isLoading && <LoadingSkeleton type="list" count={4} />}
      {error && <ErrorState onRetry={() => refetch()} />}

      {data && (
        <div className="space-y-4">
          <OrderOverview
            order={data}
            linkBrand={false}
            linkProducts={false}
            sellerFooter={(so) =>
              so.shipment ? <ShipmentTimeline shipment={so.shipment} brandName={so.brandName} /> : null
            }
          />
        </div>
      )}
    </PortalLayout>
  );
}
