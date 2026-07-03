"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, getProductModerationWarnings } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { FlagProductDialog } from "@/components/portal/FlagProductDialog";
import {
  PortalActionButton,
  PortalActionGroup,
  PortalActionLink,
} from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { productStatusLabel } from "@/lib/status-labels";
import { formatPrice } from "@/utils/format-price";
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

function ModerationActions({
  product,
  missingImages,
  onFlag,
  showApprove,
  showFlag,
}: {
  product: Product;
  missingImages: boolean;
  onFlag: (product: Product) => void;
  showApprove?: boolean;
  showFlag?: boolean;
}) {
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      actionFeedback({ successMessage: "Đã duyệt sản phẩm" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể duyệt sản phẩm" }).onError,
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      actionFeedback({ successMessage: "Đã từ chối sản phẩm" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể từ chối sản phẩm" }).onError,
  });

  return (
    <PortalActionGroup className={portalTableActionsClass}>
      <PortalActionLink variant="view" href={`/admin/products/moderation/${product.id}`}>
        Chi tiết
      </PortalActionLink>
      {showApprove && (
        <PortalActionButton
          variant="approve"
          disabled={missingImages || approve.isPending}
          loading={approve.isPending}
          onClick={() => approve.mutate(product.id)}
        >
          Duyệt
        </PortalActionButton>
      )}
      <PortalActionButton variant="reject" loading={reject.isPending} onClick={() => reject.mutate(product.id)}>
        Từ chối
      </PortalActionButton>
      {showFlag && (
        <PortalActionButton variant="flag" onClick={() => onFlag(product)}>
          Gắn cờ
        </PortalActionButton>
      )}
    </PortalActionGroup>
  );
}

function ProductModerationList({
  products,
  mode,
  onFlag,
}: {
  products: Product[];
  mode: "pending" | "flagged";
  onFlag: (product: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {mode === "pending" ? "Không có sản phẩm chờ duyệt." : "Không có sản phẩm đang gắn cờ."}
      </p>
    );
  }

  return (
    <>
      <div className={portalCardListClass}>
        {products.map((p) => {
          const warnings = getProductModerationWarnings(p);
          const missingImages = !p.images.length;
          return (
            <article key={p.id} className={portalCardClass}>
              <div className={portalCardRowClass}>
                <div className="min-w-0">
                  <Link href={`/admin/products/moderation/${p.id}`} className="font-medium text-foreground hover:underline">
                    {p.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{p.brandName}</p>
                  <p className="mt-1 text-sm">{formatPrice(p.price)}</p>
                  {p.flagReason && <p className="mt-2 text-xs text-orange-800">Lý do: {p.flagReason}</p>}
                </div>
                <Badge>{productStatusLabel(p.status)}</Badge>
              </div>
              <div className="mt-2 text-xs">
                {warnings.length === 0 ? (
                  <span className="text-green-700">Ảnh & thông tin OK</span>
                ) : (
                  <ul className="space-y-1 text-amber-700">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={portalCardActionsClass}>
                <ModerationActions
                  product={p}
                  missingImages={missingImages}
                  onFlag={onFlag}
                  showApprove={mode === "pending"}
                  showFlag={mode === "pending"}
                />
              </div>
            </article>
          );
        })}
      </div>

      <PortalDataTable>
        <PortalDataTableHead>
          <tr>
            <th className={portalTableThClass}>Sản phẩm</th>
            <th className={portalTableThClass}>Brand</th>
            <th className={portalTableThClass}>Giá</th>
            <th className={portalTableThClass}>Ảnh</th>
            <th className={portalTableThClass}>Cảnh báo</th>
            {mode === "flagged" && <th className={portalTableThClass}>Lý do gắn cờ</th>}
            <th className={portalTableThClass}>Trạng thái</th>
            <th className={portalTableThClass}>Thao tác</th>
          </tr>
        </PortalDataTableHead>
        <PortalDataTableBody>
          {products.map((p) => {
            const warnings = getProductModerationWarnings(p);
            const missingImages = !p.images.length;
            return (
              <tr key={p.id}>
                <td className={portalTableTdClass}>
                  <Link href={`/admin/products/moderation/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className={portalTableTdClass}>{p.brandName}</td>
                <td className={portalTableTdClass}>{formatPrice(p.price)}</td>
                <td className={portalTableTdClass}>{p.images.length}</td>
                <td className={portalTableTdClass}>
                  {warnings.length === 0 ? (
                    <span className="text-green-700">OK</span>
                  ) : (
                    <ul className="space-y-1 text-xs text-amber-700">
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </td>
                {mode === "flagged" && (
                  <td className={portalTableTdClass}>
                    <span className="text-xs text-orange-800">{p.flagReason || "—"}</span>
                  </td>
                )}
                <td className={portalTableTdClass}>
                  <Badge>{productStatusLabel(p.status)}</Badge>
                </td>
                <td className={portalTableTdClass}>
                  <ModerationActions
                    product={p}
                    missingImages={missingImages}
                    onFlag={onFlag}
                    showApprove={mode === "pending"}
                    showFlag={mode === "pending"}
                  />
                </td>
              </tr>
            );
          })}
        </PortalDataTableBody>
      </PortalDataTable>
    </>
  );
}

export default function AdminProductModerationPage() {
  return (
    <Suspense fallback={<LoadingSkeleton type="list" />}>
      <AdminProductModerationContent />
    </Suspense>
  );
}

function AdminProductModerationContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "flagged" ? "flagged" : "pending";
  const [activeTab, setActiveTab] = useState<"pending" | "flagged">(initialTab);
  const [flagTarget, setFlagTarget] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: ["admin-pending-products"],
    queryFn: () => adminApi.getPendingProducts(),
  });

  const flaggedQuery = useQuery({
    queryKey: ["admin-flagged-products"],
    queryFn: () => adminApi.getFlaggedProducts(),
    retry: false,
  });

  const flag = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.flagProduct(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      setFlagTarget(null);
      actionFeedback({ successMessage: "Đã gắn cờ sản phẩm" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể gắn cờ sản phẩm" }).onError,
  });

  const flaggedCountLabel = flaggedQuery.isLoading
    ? "…"
    : flaggedQuery.error
      ? "?"
      : (flaggedQuery.data?.length ?? 0);

  return (
    <PortalAdminPage
      title="Duyệt sản phẩm"
      description="Kiểm tra ảnh, giá và thông tin trước khi hiển thị công khai."
      isLoading={pendingQuery.isLoading}
      error={pendingQuery.error}
      onRetry={() => pendingQuery.refetch()}
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "flagged")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Chờ duyệt ({pendingQuery.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="flagged">
            Đã gắn cờ ({flaggedCountLabel})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <ProductModerationList
            products={pendingQuery.data ?? []}
            mode="pending"
            onFlag={setFlagTarget}
          />
        </TabsContent>
        <TabsContent value="flagged">
          {flaggedQuery.isLoading && <LoadingSkeleton type="list" />}
          {flaggedQuery.error && (
            <ErrorState
              title="Không tải được sản phẩm gắn cờ"
              message="Backend có thể chưa cập nhật. Hãy khởi động lại server API rồi thử lại."
              onRetry={() => flaggedQuery.refetch()}
            />
          )}
          {!flaggedQuery.isLoading && !flaggedQuery.error && (
            <ProductModerationList
              products={flaggedQuery.data ?? []}
              mode="flagged"
              onFlag={setFlagTarget}
            />
          )}
        </TabsContent>
      </Tabs>

      <FlagProductDialog
        open={!!flagTarget}
        onOpenChange={(open) => !open && setFlagTarget(null)}
        productName={flagTarget?.name}
        loading={flag.isPending}
        onConfirm={(reason) => {
          if (flagTarget) flag.mutate({ id: flagTarget.id, reason });
        }}
      />
    </PortalAdminPage>
  );
}
