"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { brandApi } from "@/services/brand-api";
import { PortalLayout, brandNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCT_CATEGORIES } from "@/utils/constants";

export default function BrandNewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", category: "", price: "", colors: "", sizes: "",
    purchaseUrl: "", fitType: "REGULAR", styleTags: "", occasionTags: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await brandApi.createProduct({
        name: form.name,
        category: form.category,
        price: Number(form.price),
        colors: form.colors.split(",").map((c) => c.trim()),
        sizes: form.sizes.split(",").map((s) => s.trim()),
        purchaseUrl: form.purchaseUrl,
        fitType: form.fitType,
        styleTags: form.styleTags.split(",").map((t) => t.trim()),
        occasionTags: form.occasionTags.split(",").map((t) => t.trim()),
      });
      router.push("/brand/products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout title="Brand" nav={brandNav}>
      <h1 className="text-2xl font-bold">Thêm sản phẩm mới</h1>
      <Card className="mt-8">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tên sản phẩm</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" required />
            </div>
            <div>
              <Label>Danh mục</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required>
                <option value="">Chọn</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Giá (VND)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" required />
            </div>
            <div>
              <Label>Màu (phân cách bằng dấu phẩy)</Label>
              <Input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className="mt-1" placeholder="Đen, Trắng, Navy" />
            </div>
            <div>
              <Label>Size (phân cách bằng dấu phẩy)</Label>
              <Input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className="mt-1" placeholder="S, M, L, XL" />
            </div>
            <div>
              <Label>Link mua hàng</Label>
              <Input value={form.purchaseUrl} onChange={(e) => setForm({ ...form, purchaseUrl: e.target.value })} className="mt-1" required />
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Tạo sản phẩm"}</Button>
          </form>
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
