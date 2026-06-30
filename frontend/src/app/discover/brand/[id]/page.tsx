"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { productApi } from "@/services/product-api";
import { publicBrandApi } from "@/services/brand-api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/common/ProductCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { PRODUCT_CATEGORIES } from "@/utils/constants";
import { catalogProductGridClass, consumerPageShellClass } from "@/lib/design-tokens";
import { categoryFilterLabel, filterProductsByCategory } from "@/lib/product-category";

const ALL_CATEGORIES = "all";

export default function DiscoverBrandPage() {
  const params = useParams<{ id: string }>();
  const brandId = params.id;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [aiOnly, setAiOnly] = useState(false);

  const {
    data: brand,
    isLoading: brandLoading,
    error: brandError,
    refetch: refetchBrand,
  } = useQuery({
    queryKey: ["brands", "public", brandId],
    queryFn: () => publicBrandApi.getById(brandId),
    enabled: !!brandId,
  });

  const { data: rawData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } =
    useQuery({
      queryKey: ["products", "brand", brandId, search, aiOnly],
      queryFn: () =>
        productApi.list({
          brandId,
          search: search || undefined,
          aiTryOnEligible: aiOnly || undefined,
        }),
      enabled: !!brandId,
    });

  const data = useMemo(() => {
    if (!rawData) return rawData;
    const items = filterProductsByCategory(rawData.items, category, ALL_CATEGORIES);
    if (items.length === rawData.items.length) return rawData;
    return { ...rawData, items, total: items.length };
  }, [rawData, category]);

  const isLoading = brandLoading || productsLoading;
  const error = brandError || productsError;
  const refetch = () => {
    void refetchBrand();
    void refetchProducts();
  };

  const hasActiveFilters = category !== ALL_CATEGORIES || aiOnly || search.trim().length > 0;
  const brandName = brand?.name ?? "Thương hiệu";

  const clearFilters = () => {
    setSearch("");
    setCategory(ALL_CATEGORIES);
    setAiOnly(false);
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title={brandName}
        subtitle={data ? `${data.items.length} sản phẩm` : "Đang tải..."}
        backHref="/discover"
        backLabel="Khám phá"
        trailing={
          <>
            <Input
              data-discover-search
              placeholder="Tìm trong thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-full border-border/60 bg-white px-2.5 text-xs sm:h-9 sm:w-40 sm:flex-none sm:px-3 sm:text-sm"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 min-w-[6.5rem] rounded-full border-border/60 bg-white px-2.5 text-xs sm:h-9 sm:min-w-[7.5rem] sm:text-sm">
                <SelectValue placeholder="Danh mục">
                  {categoryFilterLabel(category, ALL_CATEGORIES)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>Tất cả</SelectItem>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={aiOnly ? "default" : "outline"}
              className="h-8 shrink-0 rounded-full px-2.5 text-[10px] sm:h-9 sm:px-3 sm:text-xs"
              onClick={() => setAiOnly(!aiOnly)}
            >
              Thử AI
            </Button>
          </>
        }
      />

      {brand && (
        <div className="mb-4 flex items-center gap-3 border-b border-border/40 pb-3 sm:mb-5 sm:gap-4 sm:pb-4">
          {brand.logoUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border/50 bg-white sm:h-14 sm:w-14">
              <Image src={brand.logoUrl} alt="" fill className="object-cover" sizes="56px" unoptimized />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary sm:h-14 sm:w-14">
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-foreground sm:text-xl">{brandName}</h2>
            {brand.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{brand.description}</p>
            )}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Đang lọc:</span>
          {category !== ALL_CATEGORIES && (
            <Badge variant="secondary">{categoryFilterLabel(category, ALL_CATEGORIES)}</Badge>
          )}
          {aiOnly && <Badge variant="secondary">Thử AI</Badge>}
          {search.trim() && <Badge variant="secondary">&quot;{search.trim()}&quot;</Badge>}
          <Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={clearFilters}>
            Xóa tất cả
          </Button>
        </div>
      )}

      <div>
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Thương hiệu này chưa có sản phẩm phù hợp bộ lọc hiện tại."
          />
        )}
        {data && data.items.length > 0 && (
          <div className={catalogProductGridClass}>
            {data.items.map((p) => (
              <ProductCard key={p.id} product={p} size="catalog" />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
