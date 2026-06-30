"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandProductImagesUpload } from "@/components/brand/BrandImageUpload";
import { brandApi } from "@/services/brand-api";
import { PRODUCT_CATEGORIES, FIT_PREFERENCES } from "@/utils/constants";
import type { CreateProductRequest } from "@/types/brand";
import type { SizeChartRow } from "@/types/product";

const DEFAULT_SIZES = ["S", "M", "L", "XL"];

export interface BrandProductFormValues {
  name: string;
  category: string;
  price: string;
  colors: string;
  sizes: string;
  material: string;
  fitType: string;
  styleTags: string;
  occasionTags: string;
  purchaseUrl: string;
  description: string;
  imageUrls: string;
  sizeCharts: SizeChartRow[];
}

export function emptyBrandProductForm(): BrandProductFormValues {
  return {
    name: "",
    category: "",
    price: "",
    colors: "",
    sizes: "S, M, L, XL",
    material: "",
    fitType: "REGULAR",
    styleTags: "",
    occasionTags: "",
    purchaseUrl: "",
    description: "",
    imageUrls: "",
    sizeCharts: DEFAULT_SIZES.map((sizeLabel, index) => ({
      sizeLabel,
      chestCm: 88 + index * 4,
      waistCm: 70 + index * 3,
      hipCm: 92 + index * 3,
      heightMinCm: 150 + index * 5,
      heightMaxCm: 165 + index * 5,
      weightMinKg: 45 + index * 5,
      weightMaxKg: 60 + index * 5,
    })),
  };
}

export function productToFormValues(product: {
  name: string;
  category: string;
  price: number;
  colors: string[];
  sizes: string[];
  material?: string;
  fitType: string;
  styleTags: string[];
  occasionTags: string[];
  purchaseUrl: string;
  description?: string;
  images: string[];
  sizeCharts?: SizeChartRow[];
}): BrandProductFormValues {
  const sizes = product.sizes.length ? product.sizes : DEFAULT_SIZES;
  return {
    name: product.name,
    category: product.category,
    price: String(product.price),
    colors: product.colors.join(", "),
    sizes: sizes.join(", "),
    material: product.material || "",
    fitType: product.fitType,
    styleTags: product.styleTags.join(", "),
    occasionTags: product.occasionTags.join(", "),
    purchaseUrl: product.purchaseUrl,
    description: product.description || "",
    imageUrls: product.images.join("\n"),
    sizeCharts: product.sizeCharts?.length
      ? product.sizeCharts
      : sizes.map((sizeLabel, index) => ({
          sizeLabel,
          chestCm: 88 + index * 4,
          waistCm: 70 + index * 3,
          hipCm: 92 + index * 3,
          heightMinCm: 150 + index * 5,
          heightMaxCm: 165 + index * 5,
          weightMinKg: 45 + index * 5,
          weightMaxKg: 60 + index * 5,
        })),
  };
}

export function formValuesToRequest(form: BrandProductFormValues): CreateProductRequest {
  return {
    name: form.name,
    category: form.category,
    price: Number(form.price),
    colors: form.colors.split(",").map((c) => c.trim()).filter(Boolean),
    sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
    material: form.material || undefined,
    fitType: form.fitType,
    styleTags: form.styleTags.split(",").map((t) => t.trim()).filter(Boolean),
    occasionTags: form.occasionTags.split(",").map((t) => t.trim()).filter(Boolean),
    purchaseUrl: form.purchaseUrl,
    description: form.description || undefined,
    images: form.imageUrls.split("\n").map((u) => u.trim()).filter(Boolean),
    sizeCharts: form.sizeCharts,
  };
}

interface BrandProductFormProps {
  form: BrandProductFormValues;
  setForm: React.Dispatch<React.SetStateAction<BrandProductFormValues>>;
  onSubmit: (data: CreateProductRequest) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  extraActions?: React.ReactNode;
}

export function BrandProductForm({
  form,
  setForm,
  onSubmit,
  loading,
  submitLabel = "Lưu sản phẩm",
  extraActions,
}: BrandProductFormProps) {
  const [imageError, setImageError] = useState("");

  const parsedSizes = useMemo(
    () => form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
    [form.sizes],
  );

  const syncSizeCharts = (sizes: string[]) => {
    setForm((prev) => ({
      ...prev,
      sizeCharts: sizes.map((sizeLabel) => {
        const existing = prev.sizeCharts.find((r) => r.sizeLabel === sizeLabel);
        if (existing) return existing;
        const index = sizes.indexOf(sizeLabel);
        return {
          sizeLabel,
          chestCm: 88 + index * 4,
          waistCm: 70 + index * 3,
          hipCm: 92 + index * 3,
          heightMinCm: 150 + index * 5,
          heightMaxCm: 165 + index * 5,
          weightMinKg: 45 + index * 5,
          weightMaxKg: 60 + index * 5,
        };
      }),
    }));
  };

  const updateChart = (index: number, field: keyof SizeChartRow, value: string) => {
    setForm((prev) => {
      const charts = [...prev.sizeCharts];
      const row = { ...charts[index] };
      if (field === "sizeLabel") {
        row.sizeLabel = value;
      } else {
        const num = value === "" ? undefined : Number(value);
        (row as Record<string, unknown>)[field] = num;
      }
      charts[index] = row;
      return { ...prev, sizeCharts: charts };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const images = form.imageUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (images.length === 0) {
      setImageError("Cần ít nhất 1 ảnh sản phẩm");
      return;
    }
    setImageError("");
    await onSubmit(formValuesToRequest(form));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Tên sản phẩm</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" required />
      </div>
      <div>
        <Label>Danh mục</Label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="mt-1 w-full rounded-xl border border-border/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        >
          <option value="">Chọn</option>
          {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <Label>Giá (VND)</Label>
        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" required />
      </div>
      <div>
        <Label>Mô tả</Label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 w-full rounded-xl border border-border/60 px-3 py-2 text-sm min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <BrandProductImagesUpload
          value={form.imageUrls}
          onChange={(imageUrls) => setForm({ ...form, imageUrls })}
          onUpload={(file) => brandApi.uploadProductImage(file)}
          disabled={loading}
        />
        {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Màu (phân cách bằng dấu phẩy)</Label>
          <Input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className="mt-1" placeholder="Đen, Trắng, Navy" />
        </div>
        <div>
          <Label>Size (phân cách bằng dấu phẩy)</Label>
          <Input
            value={form.sizes}
            onChange={(e) => {
              const sizes = e.target.value;
              setForm({ ...form, sizes });
              syncSizeCharts(sizes.split(",").map((s) => s.trim()).filter(Boolean));
            }}
            className="mt-1"
            placeholder="S, M, L, XL"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Chất liệu</Label>
          <Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="mt-1" placeholder="Cotton, Polyester..." />
        </div>
        <div>
          <Label>Form dáng</Label>
          <select
            value={form.fitType}
            onChange={(e) => setForm({ ...form, fitType: e.target.value })}
            className="mt-1 w-full rounded-xl border border-border/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {FIT_PREFERENCES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Style tags (phân cách bằng dấu phẩy)</Label>
        <Input value={form.styleTags} onChange={(e) => setForm({ ...form, styleTags: e.target.value })} className="mt-1" placeholder="Casual, Minimal" />
      </div>
      <div>
        <Label>Occasion tags (phân cách bằng dấu phẩy)</Label>
        <Input value={form.occasionTags} onChange={(e) => setForm({ ...form, occasionTags: e.target.value })} className="mt-1" placeholder="Cafe, Office" />
      </div>
      <div>
        <Label>Link mua hàng</Label>
        <Input value={form.purchaseUrl} onChange={(e) => setForm({ ...form, purchaseUrl: e.target.value })} className="mt-1" required />
      </div>

      {parsedSizes.length > 0 && (
        <div>
          <Label>Bảng size (cm / kg)</Label>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-2 text-left">Size</th>
                  <th className="px-2 py-2 text-left">Ngực</th>
                  <th className="px-2 py-2 text-left">Eo</th>
                  <th className="px-2 py-2 text-left">Hông</th>
                  <th className="px-2 py-2 text-left">Cao min</th>
                  <th className="px-2 py-2 text-left">Cao max</th>
                  <th className="px-2 py-2 text-left">Cân min</th>
                  <th className="px-2 py-2 text-left">Cân max</th>
                </tr>
              </thead>
              <tbody>
                {form.sizeCharts.filter((r) => parsedSizes.includes(r.sizeLabel)).map((row) => {
                  const chartIndex = form.sizeCharts.findIndex((c) => c.sizeLabel === row.sizeLabel);
                  return (
                  <tr key={row.sizeLabel} className="border-t">
                    <td className="px-2 py-1 font-medium">{row.sizeLabel}</td>
                    {(["chestCm", "waistCm", "hipCm", "heightMinCm", "heightMaxCm", "weightMinKg", "weightMaxKg"] as const).map((field) => (
                      <td key={field} className="px-1 py-1">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={row[field] ?? ""}
                          onChange={(e) => updateChart(chartIndex, field, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Đang lưu..." : submitLabel}</Button>
        {extraActions}
      </div>
    </form>
  );
}
