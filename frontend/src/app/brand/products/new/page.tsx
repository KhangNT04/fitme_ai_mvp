"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  BrandProductForm,
  emptyBrandProductForm,
} from "@/components/brand/BrandProductForm";

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
  const [loading, setLoading] = useState(false);

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Thêm sản phẩm mới</h1>
      <Card className="mt-8">
        <CardContent className="p-6">
          <BrandProductForm
            form={form}
            setForm={setForm}
            loading={loading}
            submitLabel="Tạo sản phẩm"
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await brandApi.createProduct(data);
                router.push("/brand/products");
              } finally {
                setLoading(false);
              }
            }}
          />
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
