"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import {
  BrandProductForm,
  LIVE_PRODUCT_RE_REVIEW_NOTICE,
  emptyBrandProductForm,
  movedBackToReview,
  productToFormValues,
} from "@/components/brand/BrandProductForm";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function BrandEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [form, setForm] = useState(emptyBrandProductForm());

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["brand-product", id],
    queryFn: () => brandApi.getProduct(id),
  });

  useEffect(() => {
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate editable form from fetched product
      setForm(productToFormValues(product));
    }
  }, [product]);

  const invalidateProduct = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["brand-products"] }),
      queryClient.invalidateQueries({ queryKey: ["brand-product", id] }),
    ]);

  const canSubmitReview = product?.status !== "ACTIVE" && product?.status !== "PENDING_REVIEW";

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Chỉnh sửa sản phẩm"
        backHref="/brand/products"
        backLabel="Sản phẩm"
      />
      {isLoading ? <LoadingSkeleton count={1} /> : error || !product ? (
        <ErrorState
          title="Không tải được sản phẩm"
          message={error ? getUserErrorMessage(error, "Không thể tải dữ liệu. Vui lòng thử lại.") : undefined}
          onRetry={() => refetch()}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <BrandProductForm
              form={form}
              setForm={setForm}
              loading={loading}
              submitLabel="Lưu"
              live={product.status === "ACTIVE"}
              onSubmit={async (data) => {
                setLoading(true);
                try {
                  const updated = await brandApi.updateProduct(id, data);
                  void invalidateProduct();
                  if (movedBackToReview(product.status, updated.status)) {
                    toast.info(LIVE_PRODUCT_RE_REVIEW_NOTICE, 9000);
                  } else {
                    toast.success("Đã lưu sản phẩm");
                  }
                  router.push("/brand/products");
                } catch (err) {
                  toast.error(getUserErrorMessage(err, "Không thể lưu sản phẩm"));
                } finally {
                  setLoading(false);
                }
              }}
              extraActions={
                canSubmitReview ? (
                  <PortalActionButton
                    variant="submit"
                    disabled={submittingReview || loading}
                    loading={submittingReview}
                    onClick={async () => {
                      setSubmittingReview(true);
                      try {
                        await brandApi.submitReview(id);
                        void invalidateProduct();
                        toast.success("Đã gửi sản phẩm chờ duyệt");
                        router.push("/brand/products");
                      } catch (err) {
                        toast.error(getUserErrorMessage(err, "Không thể gửi duyệt"));
                      } finally {
                        setSubmittingReview(false);
                      }
                    }}
                  >
                    {submittingReview ? "Đang gửi..." : "Gửi duyệt"}
                  </PortalActionButton>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
