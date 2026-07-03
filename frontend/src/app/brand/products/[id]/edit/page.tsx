"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import {
  BrandProductForm,
  emptyBrandProductForm,
  productToFormValues,
} from "@/components/brand/BrandProductForm";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";

export default function BrandEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [form, setForm] = useState(emptyBrandProductForm());

  const { data: product, isLoading } = useQuery({
    queryKey: ["brand-product", id],
    queryFn: () => brandApi.getProduct(id),
  });

  useEffect(() => {
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate editable form from fetched product
      setForm(productToFormValues(product));
    }
  }, [product]);

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title="Chỉnh sửa sản phẩm"
        backHref="/brand/products"
        backLabel="Sản phẩm"
      />
      {isLoading ? <LoadingSkeleton count={1} /> : (
        <Card>
          <CardContent className="p-6">
            <BrandProductForm
              form={form}
              setForm={setForm}
              loading={loading}
              submitLabel="Lưu"
              onSubmit={async (data) => {
                setLoading(true);
                try {
                  await brandApi.updateProduct(id, data);
                  toast.success("Đã lưu sản phẩm");
                  router.push("/brand/products");
                } catch (err) {
                  toast.error(getUserErrorMessage(err, "Không thể lưu sản phẩm"));
                } finally {
                  setLoading(false);
                }
              }}
              extraActions={
                <PortalActionButton
                  variant="submit"
                  disabled={submittingReview || loading}
                  loading={submittingReview}
                  onClick={async () => {
                    setSubmittingReview(true);
                    try {
                      await brandApi.submitReview(id);
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
              }
            />
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
