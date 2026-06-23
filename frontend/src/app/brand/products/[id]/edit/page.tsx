"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function BrandEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", purchaseUrl: "" });

  const { data: product, isLoading } = useQuery({
    queryKey: ["brand-product", id],
    queryFn: () => brandApi.getProduct(id),
  });

  useEffect(() => {
    if (product) {
      setForm({ name: product.name, price: String(product.price), purchaseUrl: product.purchaseUrl });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await brandApi.updateProduct(id, {
        name: form.name,
        price: Number(form.price),
        purchaseUrl: form.purchaseUrl,
      });
      router.push("/brand/products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="text-2xl font-bold">Chỉnh sửa sản phẩm</h1>
      {isLoading ? <LoadingSkeleton count={1} /> : (
        <Card className="mt-8">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tên</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Giá</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Link mua</Label>
                <Input value={form.purchaseUrl} onChange={(e) => setForm({ ...form, purchaseUrl: e.target.value })} className="mt-1" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>Lưu</Button>
                <Button type="button" variant="outline" onClick={() => brandApi.submitReview(id)}>Gửi duyệt</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  );
}
