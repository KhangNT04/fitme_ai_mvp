"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import {
  BrandProductForm,
  emptyBrandProductForm,
  productToFormValues,
} from "@/components/brand/BrandProductForm";

export default function BrandEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyBrandProductForm());

  const { data: product, isLoading } = useQuery({
    queryKey: ["brand-product", id],
    queryFn: () => brandApi.getProduct(id),
  });

  useEffect(() => {
    if (product) {
      setForm(productToFormValues(product));
    }
  }, [product]);

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Chỉnh sửa sản phẩm</h1>
      {isLoading ? <LoadingSkeleton count={1} /> : (
        <Card className="mt-8">
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
                  router.push("/brand/products");
                } finally {
                  setLoading(false);
                }
              }}
              extraActions={
                <Button type="button" variant="outline" onClick={() => brandApi.submitReview(id)}>
                  Gửi duyệt
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
