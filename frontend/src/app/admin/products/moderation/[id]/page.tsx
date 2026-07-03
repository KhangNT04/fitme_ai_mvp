"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi, getProductModerationWarnings } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalFormCard, PortalWarningCard } from "@/components/portal/PortalFormCard";
import { AdminProductDetail } from "@/components/portal/AdminProductDetail";
import { FlagProductDialog } from "@/components/portal/FlagProductDialog";
import {
  PortalActionButton,
  PortalActionGroup,
} from "@/components/portal/PortalActionButton";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminProductModerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [flagOpen, setFlagOpen] = useState(false);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => adminApi.getProduct(id),
  });

  const approve = useMutation({
    mutationFn: () => adminApi.approveProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      actionFeedback({ successMessage: "Đã duyệt sản phẩm" }).onSuccess();
      router.push("/admin/products/moderation");
    },
    onError: actionFeedback({ errorMessage: "Không thể duyệt sản phẩm" }).onError,
  });

  const reject = useMutation({
    mutationFn: () => adminApi.rejectProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      actionFeedback({ successMessage: "Đã từ chối sản phẩm" }).onSuccess();
      router.push("/admin/products/moderation");
    },
    onError: actionFeedback({ errorMessage: "Không thể từ chối sản phẩm" }).onError,
  });

  const flag = useMutation({
    mutationFn: (reason: string) => adminApi.flagProduct(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      setFlagOpen(false);
      actionFeedback({ successMessage: "Đã gắn cờ sản phẩm" }).onSuccess();
      router.push("/admin/products/moderation?tab=flagged");
    },
    onError: actionFeedback({ errorMessage: "Không thể gắn cờ sản phẩm" }).onError,
  });

  const warnings = product ? getProductModerationWarnings(product) : [];
  const missingImages = product ? !product.images.length : false;
  const canModerate = product?.status === "PENDING_REVIEW" || product?.status === "FLAGGED";

  return (
    <PortalAdminPage
      title="Chi tiết sản phẩm"
      description="Xem đầy đủ thông tin trước khi duyệt, từ chối hoặc gắn cờ."
      backHref="/admin/products/moderation"
      backLabel="Duyệt sản phẩm"
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="detail"
    >
      {product && (
        <PortalFormCard>
          {warnings.length > 0 && (
            <PortalWarningCard className="mb-6">
              <ul className="space-y-1 text-sm">
                {warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            </PortalWarningCard>
          )}

          <AdminProductDetail product={product} flagReason={product.flagReason} />

          {canModerate && (
            <PortalActionGroup className="mt-8 border-t border-border/60 pt-6">
              {product.status === "PENDING_REVIEW" && (
                <PortalActionButton
                  variant="approve"
                  disabled={missingImages || approve.isPending}
                  loading={approve.isPending}
                  onClick={() => approve.mutate()}
                >
                  Duyệt
                </PortalActionButton>
              )}
              <PortalActionButton variant="reject" loading={reject.isPending} onClick={() => reject.mutate()}>
                Từ chối
              </PortalActionButton>
              {product.status === "PENDING_REVIEW" && (
                <PortalActionButton variant="flag" onClick={() => setFlagOpen(true)}>
                  Gắn cờ
                </PortalActionButton>
              )}
            </PortalActionGroup>
          )}
        </PortalFormCard>
      )}

      <FlagProductDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        productName={product?.name}
        loading={flag.isPending}
        onConfirm={(reason) => flag.mutate(reason)}
      />
    </PortalAdminPage>
  );
}
