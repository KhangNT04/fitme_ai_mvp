"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { Card, CardContent } from "@/components/ui/card";
import {
  BrandProductForm,
  emptyBrandProductForm,
} from "@/components/brand/BrandProductForm";
import { toast } from "@/stores/toast-store";
import { getUserErrorMessage } from "@/lib/user-error-message";

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&h=1000&q=80",
];

export default function BrandNewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    ...emptyBrandProductForm(),
    colors: "Đen, Trắng",
    imageUrls: SAMPLE_IMAGES.join("\n"),
  });
  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async () => {
    if (!productId) return;
    setSubmittingReview(true);
    try {
      await brandApi.submitReview(productId);
      toast.success("Đã gửi sản phẩm chờ duyệt");
      router.push("/brand/products");
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Không thể gửi duyệt"));
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <PortalPageHeader
        title={productId ? "Sản phẩm mới (bản nháp)" : "Thêm sản phẩm mới"}
        description={
          productId
            ? "Sản phẩm đã được lưu. Gửi duyệt khi thông tin đã đầy đủ."
            : undefined
        }
        backHref="/brand/products"
        backLabel="Sản phẩm"
      />
      <Card>
        <CardContent className="p-6">
          <BrandProductForm
            form={form}
            setForm={setForm}
            loading={loading}
            submitLabel={productId ? "Lưu thay đổi" : "Tạo sản phẩm"}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                if (productId) {
                  await brandApi.updateProduct(productId, data);
                  toast.success("Đã lưu sản phẩm");
                } else {
                  const created = await brandApi.createProduct(data);
                  setProductId(created.id);
                  toast.success("Đã tạo sản phẩm. Bạn có thể gửi duyệt ngay.");
                }
              } catch (err) {
                toast.error(
                  getUserErrorMessage(err, productId ? "Không thể lưu sản phẩm" : "Không thể tạo sản phẩm"),
                );
              } finally {
                setLoading(false);
              }
            }}
            extraActions={
              productId ? (
                <PortalActionButton
                  variant="submit"
                  disabled={submittingReview || loading}
                  loading={submittingReview}
                  onClick={handleSubmitReview}
                >
                  {submittingReview ? "Đang gửi..." : "Gửi duyệt"}
                </PortalActionButton>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
