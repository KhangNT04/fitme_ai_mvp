"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import {
  PortalActionButton,
  PortalActionGroup,
  PortalActionLink,
} from "@/components/portal/PortalActionButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { formatPrice } from "@/utils/format-price";
import { productStatusLabel } from "@/lib/status-labels";
import type { Product } from "@/types/product";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
  portalTableActionsClass,
} from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";
import { sortBrandProducts } from "@/lib/sort-brand-products";

type ConfirmState =
  | { type: "hide"; product: Product }
  | { type: "delete"; product: Product }
  | null;

function ProductVisibilityAction({
  product,
  onHide,
  onDelete,
}: {
  product: Product;
  onHide: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  if (product.status === "INACTIVE") {
    return (
      <PortalActionButton variant="delete" onClick={() => onDelete(product)}>
        Xóa
      </PortalActionButton>
    );
  }

  return (
    <PortalActionButton variant="hide" onClick={() => onHide(product)}>
      Ẩn
    </PortalActionButton>
  );
}

function ProductRowActions({
  product,
  onHide,
  onDelete,
}: {
  product: Product;
  onHide: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  return (
    <>
      <PortalActionLink variant="edit" href={`/brand/products/${product.id}/edit`}>
        Sửa
      </PortalActionLink>
      <PortalActionLink variant="analytics" href={`/brand/products/${product.id}/analytics`}>
        Phân tích
      </PortalActionLink>
      <ProductVisibilityAction product={product} onHide={onHide} onDelete={onDelete} />
    </>
  );
}

export default function BrandProductsPage() {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-products"],
    queryFn: () => brandApi.getProducts(),
  });

  const hide = useMutation({
    mutationFn: (id: string) => brandApi.hideProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-products"] });
      setConfirm(null);
      actionFeedback({ successMessage: "Đã ẩn sản phẩm" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể ẩn sản phẩm" }).onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => brandApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-products"] });
      setConfirm(null);
      actionFeedback({ successMessage: "Đã xóa sản phẩm vĩnh viễn" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa sản phẩm" }).onError,
  });

  const products = useMemo(() => (data ? sortBrandProducts(data) : []), [data]);
  const confirmLoading = hide.isPending || remove.isPending;

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === "hide") hide.mutate(confirm.product.id);
    else remove.mutate(confirm.product.id);
  };

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader title="Quản lý sản phẩm" description="Thêm, chỉnh sửa và theo dõi sản phẩm của thương hiệu.">
        <Button asChild>
          <Link href="/brand/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm
          </Link>
        </Button>
      </PortalPageHeader>

      {isLoading && <LoadingSkeleton type="list" />}
      {error && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState title="Chưa có sản phẩm" actionLabel="Thêm sản phẩm" actionHref="/brand/products/new" />
      )}
      {data && data.length > 0 && (
        <>
          <div className={portalCardListClass}>
            {products.map((p) => (
              <article key={p.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatPrice(p.price)}</p>
                  </div>
                  <Badge variant="outline">{productStatusLabel(p.status)}</Badge>
                </div>
                <PortalActionGroup className={portalCardActionsClass}>
                  <ProductRowActions
                    product={p}
                    onHide={(product) => setConfirm({ type: "hide", product })}
                    onDelete={(product) => setConfirm({ type: "delete", product })}
                  />
                </PortalActionGroup>
              </article>
            ))}
          </div>

          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Tên</th>
                <th className={portalTableThClass}>Giá</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className={portalTableTdClass}>{p.name}</td>
                  <td className={portalTableTdClass}>{formatPrice(p.price)}</td>
                  <td className={portalTableTdClass}>
                    <Badge variant="outline">{productStatusLabel(p.status)}</Badge>
                  </td>
                  <td className={portalTableTdClass}>
                    <PortalActionGroup className={portalTableActionsClass}>
                      <ProductRowActions
                        product={p}
                        onHide={(product) => setConfirm({ type: "hide", product })}
                        onDelete={(product) => setConfirm({ type: "delete", product })}
                      />
                    </PortalActionGroup>
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.type === "delete" ? "Xóa vĩnh viễn sản phẩm?" : "Ẩn sản phẩm?"}
        description={
          confirm?.type === "delete"
            ? `Sản phẩm "${confirm.product.name}" sẽ bị xóa vĩnh viễn khỏi hệ thống. Hành động này không thể hoàn tác.`
            : `Sản phẩm "${confirm?.product.name ?? ""}" sẽ chuyển sang trạng thái Tạm ẩn và không hiển thị công khai.`
        }
        confirmLabel={confirm?.type === "delete" ? "Xóa vĩnh viễn" : "Ẩn sản phẩm"}
        variant={confirm?.type === "delete" ? "destructive" : "default"}
        loading={confirmLoading}
        onConfirm={handleConfirm}
      />
    </PortalLayout>
  );
}
