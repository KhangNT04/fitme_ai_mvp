import type { Product } from "@/types/product";
import { formatPrice } from "@/utils/format-price";
import { productStatusLabel } from "@/lib/status-labels";
import { Badge } from "@/components/ui/badge";
import { FIT_PREFERENCES, TARGET_GENDERS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PLACEHOLDER_PRODUCT } from "@/lib/media-url";

type AdminProductDetailProps = {
  product: Product;
  flagReason?: string;
  className?: string;
};

function labelForFit(fitType: string) {
  return FIT_PREFERENCES.find((f) => f.value === fitType)?.label ?? fitType;
}

function labelForGender(gender?: string) {
  return TARGET_GENDERS.find((g) => g.value === gender)?.label ?? gender ?? "—";
}

export function AdminProductDetail({ product, flagReason, className }: AdminProductDetailProps) {
  const images = product.imageDetails?.length
    ? product.imageDetails
    : product.images.map((url, index) => ({ url, type: index === 0 ? "MAIN" : "DETAIL", sortOrder: index }));

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{product.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{product.brandName}</p>
        </div>
        <Badge variant="outline">{productStatusLabel(product.status)}</Badge>
      </div>

      {flagReason && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <p className="font-medium">Lý do gắn cờ</p>
          <p className="mt-1">{flagReason}</p>
        </div>
      )}

      {images.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Ảnh sản phẩm ({images.length})</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, index) => (
              <figure key={`${img.url}-${index}`} className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                <div className="relative aspect-[3/4]">
                  <Image
                    src={img.url || PLACEHOLDER_PRODUCT}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 200px"
                    unoptimized
                  />
                </div>
                <figcaption className="px-2 py-1 text-xs text-muted-foreground">{img.type}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <DetailField label="Danh mục" value={product.category} />
        <DetailField label="Giá" value={formatPrice(product.price)} />
        <DetailField label="Chất liệu" value={product.material || "—"} />
        <DetailField label="Form dáng" value={labelForFit(product.fitType)} />
        <DetailField label="Đối tượng mặc" value={labelForGender(product.targetGender)} />
        <DetailField label="Tồn kho" value={product.stockStatus} />
        <DetailField label="Thử mặc AI" value={product.aiTryOnEligible ? "Đủ điều kiện" : "Chưa đủ"} />
        <DetailField label="Link mua" value={product.purchaseUrl || "—"} className="sm:col-span-2 break-all" />
      </section>

      {product.description && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Mô tả</h3>
          <p className="whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-foreground">
            {product.description}
          </p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Màu</h3>
          <div className="flex flex-wrap gap-2">
            {product.colors.length ? (
              product.colors.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Size</h3>
          <div className="flex flex-wrap gap-2">
            {product.sizes.length ? (
              product.sizes.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </section>

      {(product.styleTags.length > 0 || product.occasionTags.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {product.styleTags.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Phong cách</h3>
              <div className="flex flex-wrap gap-2">
                {product.styleTags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {product.occasionTags.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Dịp mặc</h3>
              <div className="flex flex-wrap gap-2">
                {product.occasionTags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {product.sizeCharts && product.sizeCharts.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Bảng size</h3>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Ngực (cm)</th>
                  <th className="px-3 py-2 font-medium">Eo (cm)</th>
                  <th className="px-3 py-2 font-medium">Hông (cm)</th>
                </tr>
              </thead>
              <tbody>
                {product.sizeCharts.map((row) => (
                  <tr key={row.sizeLabel} className="border-t border-border/40">
                    <td className="px-3 py-2">{row.sizeLabel}</td>
                    <td className="px-3 py-2">{row.chestCm ?? "—"}</td>
                    <td className="px-3 py-2">{row.waistCm ?? "—"}</td>
                    <td className="px-3 py-2">{row.hipCm ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}
