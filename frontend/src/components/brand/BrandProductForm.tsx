"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandProductImagesUpload } from "@/components/brand/BrandImageUpload";
import { brandApi } from "@/services/brand-api";
import { PLACEHOLDER_PRODUCT } from "@/lib/media-url";
import { PRODUCT_CATEGORIES, FIT_PREFERENCES, TARGET_GENDERS } from "@/utils/constants";
import { purchaseUrlSchema } from "@/utils/validators";
import type { CreateProductRequest } from "@/types/brand";
import type { ProductStatus, SizeChartRow, TargetGender } from "@/types/product";

const DEFAULT_SIZES = ["S", "M", "L", "XL"];

export const LIVE_PRODUCT_REVIEW_HINT =
  "Đổi link mua, ảnh hoặc ảnh thử đồ của sản phẩm đang bán sẽ cần admin duyệt lại.";

export const LIVE_PRODUCT_RE_REVIEW_NOTICE =
  "Đã lưu. Vì bạn đổi link mua / ảnh / ảnh thử đồ, sản phẩm chuyển sang chờ duyệt lại và tạm ẩn khỏi khách cho tới khi admin duyệt.";

/** Backend sends a live product back to review when its purchase URL, images or try-on image change. */
export function movedBackToReview(previousStatus: ProductStatus | undefined, nextStatus: ProductStatus): boolean {
  return previousStatus === "ACTIVE" && nextStatus === "PENDING_REVIEW";
}

export interface BrandProductFormValues {
  name: string;
  category: string;
  price: string;
  colors: string;
  sizes: string;
  material: string;
  fitType: string;
  targetGender: TargetGender;
  styleTags: string;
  occasionTags: string;
  purchaseUrl: string;
  description: string;
  imageUrls: string;
  /** Gallery image picked for AI try-on; empty until the brand chooses. */
  tryOnImage: string;
  sizeCharts: SizeChartRow[];
}

/** Categories the VTON model cannot render, so they never get a try-on image. */
const NO_TRY_ON_CATEGORIES = new Set(["Phụ kiện", "Giày"]);

function splitImageUrls(imageUrls: string): string[] {
  return imageUrls.split("\n").map((u) => u.trim()).filter(Boolean);
}

/** The brand's pick while it is still in the gallery, else the first image; none for accessories and shoes. */
export function effectiveTryOnImage(
  form: Pick<BrandProductFormValues, "category" | "imageUrls" | "tryOnImage">,
): string | undefined {
  if (NO_TRY_ON_CATEGORIES.has(form.category)) return undefined;
  const images = splitImageUrls(form.imageUrls);
  return images.includes(form.tryOnImage) ? form.tryOnImage : images[0];
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
    targetGender: "UNISEX",
    styleTags: "",
    occasionTags: "",
    purchaseUrl: "",
    description: "",
    imageUrls: "",
    tryOnImage: "",
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
  targetGender?: TargetGender;
  styleTags: string[];
  occasionTags: string[];
  purchaseUrl: string;
  description?: string;
  images: string[];
  tryOnImage?: string;
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
    targetGender: product.targetGender ?? "UNISEX",
    styleTags: product.styleTags.join(", "),
    occasionTags: product.occasionTags.join(", "),
    purchaseUrl: product.purchaseUrl,
    description: product.description || "",
    // mapProduct shows a placeholder for products without photos; it is not a real photo to save back.
    imageUrls: product.images.filter((url) => url !== PLACEHOLDER_PRODUCT).join("\n"),
    tryOnImage: product.tryOnImage ?? "",
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
    targetGender: form.targetGender,
    styleTags: form.styleTags.split(",").map((t) => t.trim()).filter(Boolean),
    occasionTags: form.occasionTags.split(",").map((t) => t.trim()).filter(Boolean),
    purchaseUrl: form.purchaseUrl,
    description: form.description || undefined,
    images: splitImageUrls(form.imageUrls),
    tryOnImage: effectiveTryOnImage(form),
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
  /** Product is ACTIVE: media / purchase URL edits will send it back to admin review. */
  live?: boolean;
}

export function BrandProductForm({
  form,
  setForm,
  onSubmit,
  loading,
  submitLabel = "Lưu sản phẩm",
  extraActions,
  live,
}: BrandProductFormProps) {
  const [imageError, setImageError] = useState("");
  const [purchaseUrlError, setPurchaseUrlError] = useState("");

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
    const imageMessage = images.length === 0 ? "Cần ít nhất 1 ảnh sản phẩm" : "";
    const purchaseUrl = purchaseUrlSchema.safeParse(form.purchaseUrl);
    const purchaseUrlMessage = purchaseUrl.success ? "" : (purchaseUrl.error.issues[0]?.message ?? "");
    setImageError(imageMessage);
    setPurchaseUrlError(purchaseUrlMessage);
    if (imageMessage || !purchaseUrl.success) return;
    await onSubmit(formValuesToRequest({ ...form, purchaseUrl: purchaseUrl.data }));
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
        <Label htmlFor="targetGender">Đối tượng mặc</Label>
        <select
          id="targetGender"
          value={form.targetGender}
          onChange={(e) => setForm({ ...form, targetGender: e.target.value as TargetGender })}
          className="mt-1 w-full rounded-xl border border-border/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        >
          {TARGET_GENDERS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Dùng cho gợi ý AI — mọi người dùng vẫn thấy sản phẩm trong catalog.
        </p>
      </div>
      <div>
        <Label>Giá (VND)</Label>
        <Input
          type="number"
          min={1000}
          max={1000000000}
          step={1000}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="mt-1"
          required
        />
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
        {live && <p className="mb-2 text-xs text-amber-700">{LIVE_PRODUCT_REVIEW_HINT}</p>}
        <BrandProductImagesUpload
          value={form.imageUrls}
          onChange={(imageUrls) => setForm((prev) => ({ ...prev, imageUrls }))}
          onUpload={(file) => brandApi.uploadProductImage(file)}
          tryOnImage={effectiveTryOnImage(form)}
          onTryOnImageChange={
            NO_TRY_ON_CATEGORIES.has(form.category)
              ? undefined
              : (tryOnImage) => setForm((prev) => ({ ...prev, tryOnImage }))
          }
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
          <Label>Chất liệu (tùy chọn — không dùng cho AI stylist)</Label>
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
        <Label htmlFor="purchaseUrl">Link mua hàng</Label>
        <Input
          id="purchaseUrl"
          inputMode="url"
          value={form.purchaseUrl}
          onChange={(e) => setForm({ ...form, purchaseUrl: e.target.value })}
          className="mt-1"
          placeholder="https://cuahang.vn/products/ten-san-pham"
          aria-invalid={purchaseUrlError ? true : undefined}
          aria-describedby={live ? "purchaseUrl-help purchaseUrl-review-hint" : "purchaseUrl-help"}
          required
        />
        <p id="purchaseUrl-help" className="mt-1 text-xs text-muted-foreground">
          Trang sản phẩm trên website, Shopee, TikTok Shop… của bạn. Khách bấm &quot;Mua tại cửa hàng gốc&quot; sẽ tới link này.
        </p>
        {live && (
          <p id="purchaseUrl-review-hint" className="mt-1 text-xs text-amber-700">
            {LIVE_PRODUCT_REVIEW_HINT}
          </p>
        )}
        {purchaseUrlError && <p className="mt-1 text-xs text-red-600">{purchaseUrlError}</p>}
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
